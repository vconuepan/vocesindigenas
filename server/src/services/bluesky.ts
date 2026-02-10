import { HumanMessage } from '@langchain/core/messages'
import prisma from '../lib/prisma.js'
import { config } from '../config.js'
import { createLogger } from '../lib/logger.js'
import { getLLMByTier, rateLimitDelay } from './llm.js'
import { createPost, getPostMetrics, deletePost as deleteBlueskyPost, isBlueskyConfigured } from '../lib/bluesky.js'
import type { LinkCardMeta } from '../lib/bluesky.js'
import { buildBlueskyPostPrompt, buildBlueskyPickBestPrompt } from '../prompts/index.js'
import type { StoryForBlueskyPost, StoryForBlueskyPick } from '../prompts/index.js'
import { blueskyPostTextSchema, blueskyPickBestSchema } from '../schemas/bluesky.js'

const log = createLogger('bluesky-service')

// ---------------------------------------------------------------------------
// Draft generation
// ---------------------------------------------------------------------------

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Build the title line: "titleLabel: title" or just "title" */
function buildTitleLine(titleLabel: string, title: string): string {
  return titleLabel ? `${titleLabel}: ${title}` : title
}

/** Build the metadata line: "Issue | Emotion | found on Publisher" */
function buildMetaLine(parts: {
  issueName: string | null
  emotionTag: string | null
  publisherName: string
}): string {
  const segments = [
    parts.issueName,
    parts.emotionTag ? capitalize(parts.emotionTag) : null,
    `found on ${parts.publisherName}`,
  ].filter(Boolean)
  return segments.join(' | ')
}

/**
 * Assemble the structured post text from parts.
 * Format: metadata\neditorial text
 */
export function assemblePostText(parts: {
  blurb: string
  issueName: string | null
  emotionTag: string | null
  publisherName: string
}): string {
  const metaLine = buildMetaLine(parts)
  return `${metaLine}\n${parts.blurb}`
}

/**
 * Calculate max chars for the LLM editorial text given the metadata line.
 */
function calcMaxBlurbChars(parts: {
  issueName: string | null
  emotionTag: string | null
  publisherName: string
}): number {
  const metaLine = buildMetaLine(parts)
  // 300 grapheme limit minus metadata line and newline
  return Math.max(50, 300 - metaLine.length - 1)
}

/**
 * Count graphemes in a string using Intl.Segmenter (what Bluesky uses).
 * Falls back to .length if Segmenter is unavailable.
 */
function countGraphemes(text: string): number {
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' })
    return [...segmenter.segment(text)].length
  }
  return text.length
}

/**
 * Generate a Bluesky post draft for a story using LLM.
 * Saves a BlueskyPost record with status "draft".
 */
export async function generateDraft(storyId: string) {
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    include: {
      feed: true,
      issue: true,
    },
  })

  if (!story) throw new Error('Story not found')
  if (!story.title || !story.summary) throw new Error('Story must be fully analyzed (title and summary required)')

  // Prevent duplicate posts
  const existingPost = await prisma.blueskyPost.findFirst({
    where: { storyId },
  })
  if (existingPost) throw new Error('Story already has a Bluesky post')

  const publisherName = story.feed.displayTitle || story.feed.title
  const issueName = story.issue?.name ?? null
  const emotionTag = story.emotionTag
  const titleLabel = story.titleLabel || ''

  const maxChars = calcMaxBlurbChars({
    issueName,
    emotionTag,
    publisherName,
  })

  const storyForPrompt: StoryForBlueskyPost = {
    id: story.id,
    title: story.title,
    titleLabel,
    summary: story.summary,
    relevanceSummary: story.relevanceSummary,
    maxChars,
  }

  const prompt = buildBlueskyPostPrompt(storyForPrompt)
  const llm = getLLMByTier(config.bluesky.postModelTier)
  const structuredLlm = llm.withStructuredOutput(blueskyPostTextSchema)

  await rateLimitDelay()
  log.info({ storyId, maxChars }, 'generating Bluesky post draft')
  const result = await structuredLlm.invoke([new HumanMessage(prompt)])

  // Trim LLM output to maxChars if it overshot
  let blurb = result.postText.trim()
  if (blurb.length > maxChars) {
    log.warn({ storyId, blurbLength: blurb.length, maxChars }, 'LLM blurb exceeded max chars, trimming')
    blurb = blurb.slice(0, maxChars - 1) + '\u2026'
  }

  const fullText = assemblePostText({
    blurb,
    issueName,
    emotionTag,
    publisherName,
  })

  // Final grapheme count safety check
  const graphemeCount = countGraphemes(fullText)
  if (graphemeCount > 300) {
    log.warn({ storyId, graphemeCount }, 'assembled post exceeds 300 graphemes')
  }

  const post = await prisma.blueskyPost.create({
    data: {
      storyId,
      postText: fullText,
      status: 'draft',
    },
    include: { story: { include: { feed: true, issue: true } } },
  })

  log.info({ postId: post.id, storyId, textLength: fullText.length }, 'draft generated')
  return post
}

// ---------------------------------------------------------------------------
// Pick best story
// ---------------------------------------------------------------------------

/**
 * Use LLM to pick the best story from a set for Bluesky posting.
 */
export async function pickBestStory(storyIds: string[]): Promise<{ storyId: string; reasoning: string }> {
  const stories = await prisma.story.findMany({
    where: { id: { in: storyIds } },
    include: { issue: true },
  })

  if (stories.length === 0) throw new Error('No stories found')

  // Filter out stories that already have any Bluesky post (draft, published, or failed)
  const alreadyHavePost = await prisma.blueskyPost.findMany({
    where: {
      storyId: { in: storyIds },
    },
    select: { storyId: true },
  })
  const postedSet = new Set(alreadyHavePost.map((p: { storyId: string }) => p.storyId))
  const candidates = stories.filter((s) => !postedSet.has(s.id))

  if (candidates.length === 0) throw new Error('All selected stories already have a Bluesky post')

  // If only one candidate, just return it
  if (candidates.length === 1) {
    return { storyId: candidates[0].id, reasoning: 'Only one unposted story in the selection.' }
  }

  const storiesForPrompt: StoryForBlueskyPick[] = candidates.map((s) => ({
    id: s.id,
    title: s.title || s.sourceTitle,
    titleLabel: s.titleLabel || '',
    summary: s.summary || '',
    relevanceSummary: s.relevanceSummary,
    relevance: s.relevance,
    emotionTag: s.emotionTag,
    issueName: s.issue?.name ?? null,
    datePublished: s.datePublished?.toISOString() ?? null,
  }))

  const prompt = buildBlueskyPickBestPrompt(storiesForPrompt)
  const llm = getLLMByTier(config.bluesky.pickModelTier)
  const structuredLlm = llm.withStructuredOutput(blueskyPickBestSchema)

  await rateLimitDelay()
  log.info({ candidateCount: candidates.length }, 'picking best story for Bluesky')
  const result = await structuredLlm.invoke([new HumanMessage(prompt)])

  // Validate the returned storyId exists in candidates
  const valid = candidates.find((s) => s.id === result.storyId)
  if (!valid) {
    log.warn({ returnedId: result.storyId }, 'LLM returned invalid storyId, falling back to first candidate')
    return { storyId: candidates[0].id, reasoning: 'LLM returned invalid ID; selected first candidate.' }
  }

  log.info({ storyId: result.storyId, reasoning: result.reasoning }, 'best story picked')
  return result
}

/**
 * Pick the best story from a set and generate a draft for it.
 */
export async function pickAndDraft(storyIds: string[]) {
  const { storyId, reasoning } = await pickBestStory(storyIds)
  const post = await generateDraft(storyId)
  return { ...post, pickReasoning: reasoning }
}

// ---------------------------------------------------------------------------
// Draft management
// ---------------------------------------------------------------------------

export async function updateDraft(postId: string, postText: string) {
  const post = await prisma.blueskyPost.findUnique({ where: { id: postId } })
  if (!post) throw new Error('Post not found')
  if (post.status !== 'draft') throw new Error('Can only edit draft posts')

  return prisma.blueskyPost.update({
    where: { id: postId },
    data: { postText },
    include: { story: { include: { feed: true, issue: true } } },
  })
}

/**
 * Delete a Bluesky post. For published posts, also deletes from Bluesky.
 */
export async function deletePostRecord(postId: string) {
  const post = await prisma.blueskyPost.findUnique({ where: { id: postId } })
  if (!post) throw new Error('Post not found')

  // If published with a URI, delete from Bluesky first
  if (post.status === 'published' && post.postUri) {
    try {
      await deleteBlueskyPost(post.postUri)
      log.info({ postId, postUri: post.postUri }, 'deleted post from Bluesky')
    } catch (err) {
      log.warn({ err, postId, postUri: post.postUri }, 'failed to delete post from Bluesky, removing DB record anyway')
    }
  }

  await prisma.blueskyPost.delete({ where: { id: postId } })
  log.info({ postId, status: post.status }, 'deleted Bluesky post record')
}

// ---------------------------------------------------------------------------
// Publishing
// ---------------------------------------------------------------------------

/**
 * Publish a draft post to Bluesky.
 */
export async function publishPost(postId: string) {
  if (!isBlueskyConfigured()) {
    throw new Error('Bluesky credentials not configured')
  }

  const post = await prisma.blueskyPost.findUnique({
    where: { id: postId },
    include: { story: { include: { feed: true } } },
  })

  if (!post) throw new Error('Post not found')
  if (post.status !== 'draft') throw new Error('Can only publish draft posts')

  const story = post.story
  const storyUrl = `${config.bluesky.siteBaseUrl}/stories/${story.slug}`
  const publisherName = story.feed.displayTitle || story.feed.title
  const publisherUrl = story.sourceUrl

  const cardTitle = buildTitleLine(story.titleLabel || '', story.title || story.sourceTitle)

  const linkCard: LinkCardMeta = {
    uri: storyUrl,
    title: cardTitle,
    description: story.marketingBlurb || story.summary || '',
  }

  // Use og:image from our site if available
  const ogImageUrl = `${config.bluesky.siteBaseUrl}/og-image.png`
  linkCard.thumbUrl = ogImageUrl

  try {
    const result = await createPost(post.postText, linkCard, publisherName, publisherUrl)

    const updated = await prisma.blueskyPost.update({
      where: { id: postId },
      data: {
        status: 'published',
        postUri: result.uri,
        postCid: result.cid,
        publishedAt: new Date(),
      },
      include: { story: { include: { feed: true, issue: true } } },
    })

    log.info({ postId, uri: result.uri }, 'post published to Bluesky')
    return updated
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    await prisma.blueskyPost.update({
      where: { id: postId },
      data: { status: 'failed', error: errorMessage },
    })
    log.error({ err, postId }, 'failed to publish to Bluesky')
    throw err
  }
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

/**
 * Update engagement metrics for all recent published posts.
 */
export async function updateMetrics() {
  if (!isBlueskyConfigured()) {
    log.warn('Bluesky not configured, skipping metrics update')
    return
  }

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - config.bluesky.metrics.maxAgeDays)

  const posts = await prisma.blueskyPost.findMany({
    where: {
      status: 'published',
      postUri: { not: null },
      publishedAt: { gte: cutoff },
    },
  })

  if (posts.length === 0) {
    log.info('no published posts to update metrics for')
    return
  }

  log.info({ postCount: posts.length }, 'updating Bluesky engagement metrics')

  let updated = 0
  let failed = 0

  for (const post of posts) {
    try {
      const metrics = await getPostMetrics(post.postUri!)
      await prisma.blueskyPost.update({
        where: { id: post.id },
        data: {
          likeCount: metrics.likeCount,
          repostCount: metrics.repostCount,
          replyCount: metrics.replyCount,
          quoteCount: metrics.quoteCount,
          metricsUpdatedAt: new Date(),
        },
      })
      updated++
    } catch (err) {
      log.warn({ err, postId: post.id, postUri: post.postUri }, 'failed to update metrics for post')
      failed++
    }
  }

  log.info({ updated, failed }, 'metrics update complete')
}

// ---------------------------------------------------------------------------
// Listing
// ---------------------------------------------------------------------------

export async function listPosts(options: { status?: string; page?: number; limit?: number }) {
  const { status, page = 1, limit = 20 } = options
  const skip = (page - 1) * limit

  const where = status ? { status } : {}

  const [posts, total] = await Promise.all([
    prisma.blueskyPost.findMany({
      where,
      include: { story: { include: { issue: true, feed: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.blueskyPost.count({ where }),
  ])

  return { posts, total, page, limit }
}

export async function getPostById(postId: string) {
  return prisma.blueskyPost.findUnique({
    where: { id: postId },
    include: { story: { include: { issue: true, feed: true } } },
  })
}
