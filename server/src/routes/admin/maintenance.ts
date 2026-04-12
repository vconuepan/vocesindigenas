import { Router } from 'express'
import prisma from '../../lib/prisma.js'
import { fetchOgImage } from '../../lib/extract-og-image.js'
import { createLogger } from '../../lib/logger.js'

const router = Router()
const log = createLogger('maintenance')

// GET /api/admin/maintenance/story-status?slug=...
// Check the actual DB status of a story by slug
router.get('/story-status', async (req, res) => {
  const slug = req.query.slug as string
  if (!slug) {
    res.status(400).json({ error: 'slug query param required' })
    return
  }
  const story = await prisma.story.findUnique({
    where: { slug },
    select: { id: true, slug: true, status: true, title: true, datePublished: true, clusterId: true },
  })
  if (!story) {
    res.json({ found: false, slug })
    return
  }
  res.json({ found: true, ...story })
})

// POST /api/admin/maintenance/republish-slug
// Force-republish a story by slug (set status = 'published')
router.post('/republish-slug', async (req, res) => {
  const { slug } = req.body as { slug?: string }
  if (!slug) {
    res.status(400).json({ error: 'slug required in body' })
    return
  }
  const story = await prisma.story.findUnique({
    where: { slug },
    select: { id: true, slug: true, status: true, title: true },
  })
  if (!story) {
    res.status(404).json({ error: 'Story not found', slug })
    return
  }
  const prevStatus = story.status
  await prisma.story.update({ where: { id: story.id }, data: { status: 'published' } })
  log.info({ slug, prevStatus }, 'force-republished story')
  res.json({ ok: true, slug, prevStatus, newStatus: 'published', title: story.title })
})

// POST /api/admin/maintenance/backfill-images
// One-time job: extract og:image from source articles for published stories
router.post('/backfill-images', async (req, res) => {
  const stories = await prisma.story.findMany({
    where: { status: 'published', imageUrl: null },
    select: { id: true, sourceUrl: true },
  })

  log.info({ total: stories.length }, 'starting image backfill')

  let updated = 0
  let skipped = 0

  await Promise.allSettled(
    stories.map(async (story) => {
      const imageUrl = await fetchOgImage(story.sourceUrl)
      if (imageUrl) {
        await prisma.story.update({ where: { id: story.id }, data: { imageUrl } })
        updated++
      } else {
        skipped++
      }
    }),
  )

  log.info({ updated, skipped }, 'image backfill complete')
  res.json({ total: stories.length, updated, skipped })
})

export default router
