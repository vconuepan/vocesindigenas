import { Router } from 'express'
import { createLogger } from '../../lib/logger.js'
import { existsSync, createReadStream, unlinkSync } from 'fs'
import * as newsletterService from '../../services/newsletter.js'
import { generateCarouselForNewsletter } from '../../services/newsletter.js'
import { validateBody, validateQuery } from '../../middleware/validate.js'
import { expensiveOpLimiter } from '../../middleware/rateLimit.js'
import {
  createNewsletterSchema,
  updateNewsletterSchema,
  newsletterQuerySchema,
} from '../../schemas/newsletter.js'

const router = Router()
const log = createLogger('newsletters')

router.get('/', validateQuery(newsletterQuerySchema), async (req, res) => {
  try {
    const filters = req.parsedQuery || {}
    const result = await newsletterService.getNewsletters(filters)
    res.json(result)
  } catch (err) {
    log.error({ err }, 'failed to fetch newsletters')
    res.status(500).json({ error: 'Failed to fetch newsletters' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const newsletter = await newsletterService.getNewsletterById(req.params.id)
    if (!newsletter) {
      res.status(404).json({ error: 'Newsletter not found' })
      return
    }
    res.json(newsletter)
  } catch (err) {
    log.error({ err }, 'failed to fetch newsletter')
    res.status(500).json({ error: 'Failed to fetch newsletter' })
  }
})

router.post('/', validateBody(createNewsletterSchema), async (req, res) => {
  try {
    const newsletter = await newsletterService.createNewsletter(req.body)
    res.status(201).json(newsletter)
  } catch (err) {
    log.error({ err }, 'failed to create newsletter')
    res.status(500).json({ error: 'Failed to create newsletter' })
  }
})

router.put('/:id', validateBody(updateNewsletterSchema), async (req, res) => {
  try {
    const newsletter = await newsletterService.updateNewsletter(req.params.id, req.body)
    res.json(newsletter)
  } catch (err: any) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Newsletter not found' })
      return
    }
    log.error({ err }, 'failed to update newsletter')
    res.status(500).json({ error: 'Failed to update newsletter' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await newsletterService.deleteNewsletter(req.params.id)
    res.status(204).send()
  } catch (err: any) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Newsletter not found' })
      return
    }
    log.error({ err }, 'failed to delete newsletter')
    res.status(500).json({ error: 'Failed to delete newsletter' })
  }
})

router.post('/:id/assign', async (req, res) => {
  try {
    const newsletter = await newsletterService.assignStories(req.params.id)
    res.json(newsletter)
  } catch (err: any) {
    if (err.message === 'Newsletter not found') {
      res.status(404).json({ error: err.message })
      return
    }
    log.error({ err }, 'failed to assign stories')
    res.status(500).json({ error: 'Failed to assign stories' })
  }
})

router.post('/:id/generate', expensiveOpLimiter, async (req, res) => {
  try {
    const newsletter = await newsletterService.generateContent(req.params.id)
    res.json(newsletter)
  } catch (err: any) {
    if (err.message === 'Newsletter not found') {
      res.status(404).json({ error: err.message })
      return
    }
    if (err.message === 'No stories assigned') {
      res.status(400).json({ error: err.message })
      return
    }
    log.error({ err }, 'failed to generate newsletter content')
    res.status(500).json({ error: 'Failed to generate newsletter content' })
  }
})

router.post('/:id/carousel', async (req, res) => {
  try {
    const zipPath = await generateCarouselForNewsletter(req.params.id)
    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', 'attachment; filename=carousel_images.zip')
    const stream = createReadStream(zipPath)
    stream.pipe(res)
    stream.on('end', () => {
      try { unlinkSync(zipPath) } catch { /* ignore */ }
    })
  } catch (err: any) {
    if (err.message === 'Newsletter not found') {
      res.status(404).json({ error: err.message })
      return
    }
    if (err.message === 'No stories assigned') {
      res.status(400).json({ error: err.message })
      return
    }
    log.error({ err }, 'failed to generate carousel images')
    res.status(500).json({ error: 'Failed to generate carousel images' })
  }
})

export default router
