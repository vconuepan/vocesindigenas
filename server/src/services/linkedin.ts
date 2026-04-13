import { z } from 'zod'
import { HumanMessage } from '@langchain/core/messages'
import prisma from '../lib/prisma.js'
import { createLogger } from '../lib/logger.js'
import { createUgcPost, isLinkedInConfigured } from '../lib/linkedin.js'
import { getMediumLLM, rateLimitDelay } from './llm.js'
import { buildLinkedInPostPrompt } from '../prompts/linkedin.js'

const log = createLogger('linkedin-service')

const linkedInDraftSchema = z.object({
  postText: z.string().describe('The complete LinkedIn post text, ready to publish. Includes body and hashtags.'),
})

// ---------------------------------------------------------------------------
// Draft generation
// ---------------------------------------------------------------------------

export async function generateDraft(storyId: string) {
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    include: { feed: true, issue: true },
  })

  if (!story) throw new Error('Story not found')
  if (!story.title) throw new Error('Story must be fully analyzed')

  // Prevent duplicate posts
  const existingPost = await prisma.linkedInPost.findFirst({
    where: { storyId },
  })
  if (existingPost) throw new Error('Story already has a LinkedIn post')

  await rateLimitDelay()
  const llm = getMediumLLM()
  const structuredLlm = llm.withStructuredOutput(linkedInDraftSchema)

  const prompt = buildLinkedInPostPrompt({
    title: story.title,
    titleLabel: story.titleLabel,
    summary: story.summary,
    relevanceSummary: story.relevanceSummary,
    relevanceReasons: story.relevanceReasons,
    marketingBlurb: story.marketingBlurb,
    issueName: story.issue?.name ?? null,
    sourceCountry: story.feed?.url ?? null,
  })

  const result = await structuredLlm.invoke([new HumanMessage(prompt)])

  const rawPostText = result.postText.length > 2900
    ? result.postText.slice(0, 2897) + '…'
    : result.postText

  const post = await prisma.linkedInPost.create({
    data: {
      storyId,
      postText: rawPostText,
      status: 'draft',
    },
    include: { story: { include: { feed: true, issue: true } } },
  })

  log.info({ postId: post.id, storyId }, 'LinkedIn draft generated via LLM')
  return post
}

// ---------------------------------------------------------------------------
// Draft management
// ---------------------------------------------------------------------------

export async function updateDraft(postId: string, postText: string) {
  const post = await prisma.linkedInPost.findUnique({ where: { id: postId } })
  if (!post) throw new Error('Post not found')
  if (post.status !== 'draft') throw new Error('Can only edit draft posts')

  return prisma.linkedInPost.update({
    where: { id: postId },
    data: { postText },
    include: { story: { include: { feed: true, issue: true } } },
  })
}

export async function deletePostRecord(postId: string) {
  const post = await prisma.linkedInPost.findUnique({ where: { id: postId } })
  if (!post) throw new Error('Post not found')

  await prisma.linkedInPost.delete({ where: { id: postId } })
  log.info({ postId, status: post.status }, 'deleted LinkedIn post record')
}

export async function listPosts(options: { status?: string; page?: number; limit?: number }) {
  const { status, page = 1, limit = 20 } = options
  const skip = (page - 1) * limit

  const where = status ? { status } : {}

  const [posts, total] = await Promise.all([
    prisma.linkedInPost.findMany({
      where,
      include: { story: { include: { issue: true, feed: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.linkedInPost.count({ where }),
  ])

  return { posts, total, page, limit }
}

export async function getPostById(postId: string) {
  return prisma.linkedInPost.findUnique({
    where: { id: postId },
    include: { story: { include: { issue: true, feed: true } } },
  })
}

// ---------------------------------------------------------------------------
// Publishing
// ---------------------------------------------------------------------------

export async function publishPost(postId: string) {
  if (!isLinkedInConfigured()) {
    throw new Error('LinkedIn credentials not configured')
  }

  const post = await prisma.linkedInPost.findUnique({
    where: { id: postId },
    include: { story: true },
  })

  if (!post) throw new Error('Post not found')
  if (post.status !== 'draft') throw new Error('Can only publish draft posts')

  const story = post.story
  const storyUrl = `https://impactoindigena.news/stories/${story.slug}`

  try {
    const result = await createUgcPost(
      post.postText,
      storyUrl,
      story.title ?? story.sourceTitle,
      story.summary || '',
      story.imageUrl,
    )

    const updated = await prisma.linkedInPost.update({
      where: { id: postId },
      data: {
        status: 'published',
        linkedinPostId: result.id,
        postUrl: result.permalink,
        publishedAt: new Date(),
      },
      include: { story: { include: { feed: true, issue: true } } },
    })

    log.info({ postId, linkedinPostId: result.id }, 'LinkedIn post published')
    return updated
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    await prisma.linkedInPost.update({
      where: { id: postId },
      data: { status: 'failed', error: errorMessage },
    })
    log.error({ err, postId }, 'failed to publish LinkedIn post')
    throw err
  }
}
