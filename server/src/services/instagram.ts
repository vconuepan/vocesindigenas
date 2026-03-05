import prisma from '../lib/prisma.js'
import { createLogger } from '../lib/logger.js'
import { createCarouselPost, isInstagramConfigured } from '../lib/instagram.js'
import { generateCarousel } from '../lib/carouselGen.js'
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

  const storyUrl = `https://impactoindigena.news/stories/${story.slug}`

  // Caption para Instagram
  const blueskyPost = await prisma.blueskyPost.findFirst({
    where: { storyId },
    orderBy: { createdAt: 'desc' },
  })

  const baseText = blueskyPost?.postText || story.marketingBlurb || story.summary || story.title || ''
  const caption = `${baseText}\n\n${storyUrl}\n\n#PueblosIndígenas #DerechosIndígenas #ImpactoIndígena`
  const trimmedCaption = caption.length > 2200 ? caption.slice(0, 2197) + '…' : caption

  // Reusar imagen de Twitter si existe
  const twitterPost = await prisma.twitterPost.findFirst({
    where: { storyId, imageUrl: { not: null } },
  })

  let aiImageUrl = twitterPost?.imageUrl ?? null

  if (!aiImageUrl) {
    try {
      aiImageUrl = await generateStoryImage(
        storyId,
        story.title,
        story.summary || story.marketingBlurb || '',
      )
      log.info({ storyId, aiImageUrl }, 'AI image generated for Instagram')
    } catch (err) {
      log.error({ err, storyId }, 'failed to generate AI image')
      throw new Error('Failed to generate AI image for Instagram carousel')
    }
  }

  // Slide 2: resumen directo, Slide 3: por qué importa + consideraciones
  const slide2Text = story.summary || ''
  const slide3Text = [
    story.relevanceReasons || '',
    story.antifactors ? `Consideraciones: ${story.antifactors}` : '',
  ].filter(Boolean).join(' — ')

  // Generar carrusel de 4 slides
  const slides = await generateCarousel(
    storyId,
    story.title,
    slide2Text,
    slide3Text,
    storyUrl,
    aiImageUrl,
  )

  const imageUrls = slides.sort((a, b) => a.order - b.order).map((s) => s.imageUrl)

  const post = await prisma.instagramPost.create({
    data: {
      storyId,
      caption: trimmedCaption,
      imageUrl: imageUrls[0], // Primera imagen como referencia
      slideUrls: imageUrls,
      status: 'draft',
    },
    include: { story: { include: { feed: true, issue: true } } },
  })

  log.info({ postId: post.id, storyId, slideCount: imageUrls.length }, 'Instagram carousel draft generated')
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

  const imageUrls = post.slideUrls?.length ? post.slideUrls : [post.imageUrl]

  try {
    const result = await createCarouselPost(imageUrls, post.caption)

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

    log.info({ postId, instagramPostId: result.id }, 'Instagram carousel published')
    return updated
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    await prisma.instagramPost.update({
      where: { id: postId },
      data: { status: 'failed', error: errorMessage },
    })
    log.error({ err, postId }, 'failed to publish Instagram carousel')
    throw err
  }
}
