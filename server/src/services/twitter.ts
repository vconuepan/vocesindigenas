import prisma from '../lib/prisma.js'
import { createLogger } from '../lib/logger.js'
import { createTweet, getTweetMetrics, isTwitterConfigured } from '../lib/twitter.js'

const log = createLogger('twitter-service')

// ---------------------------------------------------------------------------
// Draft generation (reuses Bluesky post text)
// ---------------------------------------------------------------------------

/**
 * Generate a Twitter post draft for a story.
 * Reuses el texto del post de Bluesky si existe, si no usa marketingBlurb.
 * Guarda un registro TwitterPost con status "draft".
 */
export async function generateDraft(storyId: string) {
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    include: { feed: true, issue: true },
  })

  if (!story) throw new Error('Story not found')
  if (!story.title) throw new Error('Story must be fully analyzed')

  // Prevenir posts duplicados
  const existingPost = await prisma.twitterPost.findFirst({
    where: { storyId },
  })
  if (existingPost) throw new Error('Story already has a Twitter post')

  // Reusar texto de Bluesky si existe
  const blueskyPost = await prisma.blueskyPost.findFirst({
    where: { storyId },
    orderBy: { createdAt: 'desc' },
  })

  const postText = blueskyPost?.postText || story.marketingBlurb || story.summary || story.title || ''

  // Twitter tiene límite de 280 chars
  const trimmed = postText.length > 275
    ? postText.slice(0, 274) + '…'
    : postText

  const post = await prisma.twitterPost.create({
    data: {
      storyId,
      postText: trimmed,
      status: 'draft',
    },
    include: { story: { include: { feed: true, issue: true } } },
  })

  log.info({ postId: post.id, storyId, textLength: trimmed.length }, 'Twitter draft generated')
  return post
}

// ---------------------------------------------------------------------------
// Publishing
// ---------------------------------------------------------------------------

/**
 * Publicar un draft en Twitter/X.
 */
export async function publishPost(postId: string) {
  if (!isTwitterConfigured()) {
    throw new Error('Twitter credentials not configured')
  }

  const post = await prisma.twitterPost.findUnique({
    where: { id: postId },
    include: { story: true },
  })

  if (!post) throw new Error('Post not found')
  if (post.status !== 'draft') throw new Error('Can only publish draft posts')

  try {
    const result = await createTweet(post.postText)

    const updated = await prisma.twitterPost.update({
      where: { id: postId },
      data: {
        status: 'published',
        tweetId: result.id,
        tweetUrl: result.url,
        publishedAt: new Date(),
      },
      include: { story: { include: { feed: true, issue: true } } },
    })

    log.info({ postId, tweetId: result.id }, 'tweet published')
    return updated
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    await prisma.twitterPost.update({
      where: { id: postId },
      data: { status: 'failed', error: errorMessage },
    })
    log.error({ err, postId }, 'failed to publish tweet')
    throw err
  }
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

/**
 * Actualizar métricas de engagement para tweets recientes publicados.
 */
export async function updateMetrics() {
  if (!isTwitterConfigured()) {
    log.warn('Twitter not configured, skipping metrics update')
    return
  }

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 7)

  const posts = await prisma.twitterPost.findMany({
    where: {
      status: 'published',
      tweetId: { not: null },
      publishedAt: { gte: cutoff },
    },
  })

  if (posts.length === 0) {
    log.info('no published tweets to update metrics for')
    return
  }

  log.info({ postCount: posts.length }, 'updating Twitter metrics')

  for (const post of posts) {
    try {
      const metrics = await getTweetMetrics(post.tweetId!)
      await prisma.twitterPost.update({
        where: { id: post.id },
        data: {
          likeCount: metrics.likeCount,
          retweetCount: metrics.retweetCount,
          replyCount: metrics.replyCount,
          quoteCount: metrics.quoteCount,
          metricsUpdatedAt: new Date(),
        },
      })
    } catch (err) {
      log.warn({ err, postId: post.id }, 'failed to update metrics for tweet')
    }
  }

  log.info('Twitter metrics update complete')
}
