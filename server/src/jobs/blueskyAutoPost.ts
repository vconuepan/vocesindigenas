import prisma from '../lib/prisma.js'
import { config } from '../config.js'
import { createLogger } from '../lib/logger.js'
import { isBlueskyConfigured } from '../lib/bluesky.js'
import { pickBestStory, generateDraft, publishPost } from '../services/bluesky.js'

const log = createLogger('bluesky_auto_post')

export async function runBlueskyAutoPost(): Promise<void> {
  log.info('starting Bluesky auto-post job')

  if (!isBlueskyConfigured()) {
    log.warn('Bluesky credentials not configured, skipping auto-post')
    return
  }

  if (!config.bluesky.autoPost.enabled) {
    log.info('Bluesky auto-post is disabled')
    return
  }

  // Find stories published in the lookback window
  const since = new Date()
  since.setHours(since.getHours() - config.bluesky.autoPost.lookbackHours)

  const publishedStories = await prisma.story.findMany({
    where: {
      status: 'published',
      datePublished: { gte: since },
      title: { not: null },
      summary: { not: null },
      slug: { not: null },
    },
    select: { id: true },
  })

  if (publishedStories.length === 0) {
    log.info('no recently published stories found')
    return
  }

  // Exclude stories that already have a published Bluesky post
  const alreadyPosted = await prisma.blueskyPost.findMany({
    where: {
      storyId: { in: publishedStories.map((s) => s.id) },
      status: 'published',
    },
    select: { storyId: true },
  })
  const postedSet = new Set(alreadyPosted.map((p: { storyId: string }) => p.storyId))
  const candidates = publishedStories.filter((s) => !postedSet.has(s.id))

  if (candidates.length === 0) {
    log.info('all recent stories have already been posted')
    return
  }

  log.info({ candidateCount: candidates.length }, 'finding best story to post')

  try {
    // Pick the best story
    const candidateIds = candidates.map((s) => s.id)
    const { storyId, reasoning } = await pickBestStory(candidateIds)
    log.info({ storyId, reasoning }, 'best story selected')

    // Generate draft and immediately publish (auto mode)
    const draft = await generateDraft(storyId)
    log.info({ postId: draft.id, text: draft.postText }, 'draft generated, publishing')

    const published = await publishPost(draft.id)
    log.info({ postId: published.id, uri: published.postUri }, 'auto-post published successfully')
  } catch (err) {
    log.error({ err }, 'Bluesky auto-post failed')
    throw err
  }
}
