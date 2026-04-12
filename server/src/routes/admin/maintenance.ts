import { Router } from 'express'
import prisma from '../../lib/prisma.js'
import { fetchOgImage } from '../../lib/extract-og-image.js'
import { createLogger } from '../../lib/logger.js'

const router = Router()
const log = createLogger('maintenance')

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
