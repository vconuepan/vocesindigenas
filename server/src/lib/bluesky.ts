import { AtpAgent, RichText } from '@atproto/api'
import { config } from '../config.js'
import { createLogger } from './logger.js'
import { withRetry } from './retry.js'

const log = createLogger('bluesky')

let agent: AtpAgent | null = null
let sessionActive = false

function isConfigured(): boolean {
  return Boolean(config.bluesky.handle && config.bluesky.appPassword)
}

async function getAgent(): Promise<AtpAgent> {
  if (!isConfigured()) {
    throw new Error('Bluesky credentials not configured. Set BLUESKY_HANDLE and BLUESKY_APP_PASSWORD.')
  }

  if (!agent) {
    agent = new AtpAgent({ service: config.bluesky.serviceUrl })
  }

  if (!sessionActive) {
    log.info({ handle: config.bluesky.handle }, 'creating Bluesky session')
    await agent.login({
      identifier: config.bluesky.handle,
      password: config.bluesky.appPassword,
    })
    sessionActive = true
    log.info('Bluesky session established')
  }

  return agent
}

/** Reset session so next call re-authenticates. */
function resetSession(): void {
  sessionActive = false
}

/** Retry wrapper that re-authenticates on 401. */
async function withSessionRetry<T>(fn: (agent: AtpAgent) => Promise<T>): Promise<T> {
  return withRetry(
    async () => {
      const a = await getAgent()
      try {
        return await fn(a)
      } catch (err: unknown) {
        const status = (err as any)?.status ?? (err as any)?.response?.status
        if (status === 401) {
          log.warn('Bluesky session expired, re-authenticating')
          resetSession()
          const refreshed = await getAgent()
          return await fn(refreshed)
        }
        throw err
      }
    },
    { retries: 2, baseDelayMs: 2000 },
  )
}

// ---------------------------------------------------------------------------
// Post creation
// ---------------------------------------------------------------------------

export interface LinkCardMeta {
  uri: string
  title: string
  description: string
  thumbUrl?: string
}

export interface CreatePostResult {
  uri: string
  cid: string
}

/**
 * Create a Bluesky post with rich text and an external link card embed.
 *
 * @param fullText - Complete post text (title + blurb + footer, pre-assembled)
 * @param linkCard - External embed (Actually Relevant story page)
 * @param publisherName - Publisher display name to link in the footer
 * @param publisherUrl - Original article URL for the publisher link
 */
export async function createPost(
  fullText: string,
  linkCard: LinkCardMeta,
  publisherName: string,
  publisherUrl: string,
): Promise<CreatePostResult> {
  return withSessionRetry(async (a) => {
    // Parse rich text to detect facets
    const rt = new RichText({ text: fullText })
    await rt.detectFacets(a)

    // Add publisher name link facet (last occurrence in text)
    const pubStart = fullText.lastIndexOf(publisherName)
    if (pubStart >= 0) {
      const encoder = new TextEncoder()
      const byteStart = encoder.encode(fullText.substring(0, pubStart)).length
      const byteEnd = byteStart + encoder.encode(publisherName).length
      const existingFacet = rt.facets?.find(
        (f) => f.index.byteStart === byteStart && f.index.byteEnd === byteEnd,
      )
      if (!existingFacet) {
        if (!rt.facets) {
          rt.facets = []
        }
        rt.facets.push({
          index: { byteStart, byteEnd },
          features: [{ $type: 'app.bsky.richtext.facet#link', uri: publisherUrl }],
        })
      }
    }

    // Build external embed (link card)
    let thumb: any
    if (linkCard.thumbUrl) {
      try {
        const imgResponse = await fetch(linkCard.thumbUrl)
        if (imgResponse.ok) {
          const buffer = Buffer.from(await imgResponse.arrayBuffer())
          // Bluesky max blob size is 1MB
          if (buffer.length <= 1_000_000) {
            const contentType = imgResponse.headers.get('content-type') || 'image/jpeg'
            const uploadResult = await a.uploadBlob(buffer, { encoding: contentType })
            thumb = uploadResult.data.blob
          } else {
            log.warn({ size: buffer.length, url: linkCard.thumbUrl }, 'og:image too large, skipping thumbnail')
          }
        }
      } catch (err) {
        log.warn({ err, url: linkCard.thumbUrl }, 'failed to fetch og:image for link card')
      }
    }

    const external: any = {
      uri: linkCard.uri,
      title: linkCard.title,
      description: linkCard.description,
    }
    if (thumb) external.thumb = thumb

    log.info({ textLength: fullText.length, linkCard: linkCard.uri }, 'creating Bluesky post')

    const result = await a.post({
      text: rt.text,
      facets: rt.facets,
      embed: {
        $type: 'app.bsky.embed.external' as const,
        external,
      } as any,
      createdAt: new Date().toISOString(),
    })

    log.info({ uri: result.uri, cid: result.cid }, 'Bluesky post created')

    return { uri: result.uri, cid: result.cid }
  })
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

export interface PostMetrics {
  likeCount: number
  repostCount: number
  replyCount: number
  quoteCount: number
}

/**
 * Fetch engagement metrics for a post by its AT URI.
 */
export async function getPostMetrics(postUri: string): Promise<PostMetrics> {
  return withSessionRetry(async (a) => {
    const response = await a.getPostThread({ uri: postUri, depth: 0 })
    const thread = response.data.thread as any

    if (thread.$type !== 'app.bsky.feed.defs#threadViewPost') {
      throw new Error(`Unexpected thread type: ${thread.$type}`)
    }

    const view = thread.post
    return {
      likeCount: view.likeCount ?? 0,
      repostCount: view.repostCount ?? 0,
      replyCount: view.replyCount ?? 0,
      quoteCount: view.quoteCount ?? 0,
    }
  })
}

// ---------------------------------------------------------------------------
// Deletion
// ---------------------------------------------------------------------------

/**
 * Delete a post from Bluesky by its AT URI.
 */
export async function deletePost(postUri: string): Promise<void> {
  return withSessionRetry(async (a) => {
    log.info({ postUri }, 'deleting Bluesky post')
    await a.deletePost(postUri)
    log.info({ postUri }, 'Bluesky post deleted')
  })
}

/**
 * Check if Bluesky is configured (credentials present).
 */
export { isConfigured as isBlueskyConfigured }
