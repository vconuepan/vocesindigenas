import prisma from '../lib/prisma.js'
import { createLogger } from '../lib/logger.js'
import { createPost, isInstagramConfigured } from '../lib/instagram.js'
import { generateStoryImage } from '../lib/imageGen.js'

const log = createLogger('instagram-service')

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

  // Prevenir posts duplicados
  const existingPost = await prisma.instagramPost.findFirst({
    where: { storyId },
  })
  if (existingPost) throw new Error('Story already has an Instagram post')

  // Reusar texto de Bluesky si existe
  const blueskyPost = await prisma.blueskyPost.findFirst({
    where: { storyId },
    orderBy: { createdAt: 'desc' },
  })

  const baseText = blueskyPost?.postText || story.marketingBlurb || story.summary || story.title || ''
  const storyUrl = `https://impactoindigena.news/stories/${story.slug}`

  // Instagram permite hasta 2200 caracteres en caption
  const caption = `${baseText}\n\n${storyUrl}\n\n#PueblosIndígenas #DerechosIndígenas #ImpactoIndígena`
  const trimmed = caption.length > 2200 ? caption.slice(0, 2197) + '…' : caption

  // Reusar imagen de Twitter si existe, si no generar nueva
  const twitterPost = await prisma.twitterPost.findFirst({
    where: { storyId, imageUrl: { not: null } },
  })

  let imageUrl = twitterPost?.imageUrl ?? null

  if (!imageUrl) {
    try {
      imageUrl = await generateStoryImage(
        storyId,
        story.title,
        story.summary || story.marketingBlurb || '',
      )
      log.info({ storyId, imageUrl }, 'image generated for Instagram post')
    } catch (err) {
      log.error({ err, storyId }, 'failed to generate image for Instagram post')
      throw new Error('Instagram requires an image — image generation failed')
    }
  }

  const post = await prisma.instagramPost.create({
    data: {
      storyId,
      caption: trimmed,
      imageUrl,
      status: 'draft',
    },
    include: { story: { include: { feed: true, issue: true } } },
  })

  log.info({ postId: post.id, storyId, captionLength: trimmed.length }, 'Instagram draft generated')
  return post
}

// ---------------------------------------------------------------------------
// Publishing
// ---------------------------------------------------------------------------

export async function publishPost(postId: string) {
  if (!isInstagramConfigured()) {
    throw new Error('Instagram credentials not configured')
  }

  const post = await prisma.instagramPost.findUnique({
    where: { id: postId },
    include: { story: true },
  })

  if (!post) throw new Error('Post not found')
  if (post.status !== 'draft') throw new Error('Can only publish draft posts')
  if (!post.imageUrl) throw new Error('Instagram post requires an image')

  try {
    const result = await createPost(post.imageUrl, post.caption)

    const updated = await prisma.instagramPost.update({
      where: { id: postId },
      data: {
        status: 'published',
        instagramPostId: result.id,
        permalink: result.permalink,
        publishedAt: new Date(),
      },
      include: { story: { include: { feed: true, issue: true } } },
    })

    log.info({ postId, instagramPostId: result.id }, 'Instagram post published')
    return updated
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    await prisma.instagramPost.update({
      where: { id: postId },
      data: { status: 'failed', error: errorMessage },
    })
    log.error({ err, postId }, 'failed to publish Instagram post')
    throw err
  }
}
