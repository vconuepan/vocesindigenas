import { Router } from 'express'
import { createLogger } from '../../lib/logger.js'
import * as podcastService from '../../services/podcast.js'
import { validateBody, validateQuery } from '../../middleware/validate.js'
import { expensiveOpLimiter } from '../../middleware/rateLimit.js'
import {
  createPodcastSchema,
  updatePodcastSchema,
  podcastQuerySchema,
} from '../../schemas/podcast.js'

const router = Router()
const log = createLogger('podcasts')

router.get('/', validateQuery(podcastQuerySchema), async (req, res) => {
  try {
    const filters = req.parsedQuery || {}
    const result = await podcastService.getPodcasts(filters)
    res.json(result)
  } catch (err) {
    log.error({ err }, 'failed to fetch podcasts')
    res.status(500).json({ error: 'Failed to fetch podcasts' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const podcast = await podcastService.getPodcastById(req.params.id)
    if (!podcast) {
      res.status(404).json({ error: 'Podcast not found' })
      return
    }
    res.json(podcast)
  } catch (err) {
    log.error({ err }, 'failed to fetch podcast')
    res.status(500).json({ error: 'Failed to fetch podcast' })
  }
})

router.post('/', validateBody(createPodcastSchema), async (req, res) => {
  try {
    const podcast = await podcastService.createPodcast(req.body)
    res.status(201).json(podcast)
  } catch (err) {
    log.error({ err }, 'failed to create podcast')
    res.status(500).json({ error: 'Failed to create podcast' })
  }
})

router.put('/:id', validateBody(updatePodcastSchema), async (req, res) => {
  try {
    const podcast = await podcastService.updatePodcast(req.params.id, req.body)
    res.json(podcast)
  } catch (err: any) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Podcast not found' })
      return
    }
    log.error({ err }, 'failed to update podcast')
    res.status(500).json({ error: 'Failed to update podcast' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await podcastService.deletePodcast(req.params.id)
    res.status(204).send()
  } catch (err: any) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Podcast not found' })
      return
    }
    log.error({ err }, 'failed to delete podcast')
    res.status(500).json({ error: 'Failed to delete podcast' })
  }
})

router.post('/:id/assign', async (req, res) => {
  try {
    const podcast = await podcastService.assignStories(req.params.id)
    res.json(podcast)
  } catch (err: any) {
    if (err.message === 'Podcast not found') {
      res.status(404).json({ error: err.message })
      return
    }
    log.error({ err }, 'failed to assign stories')
    res.status(500).json({ error: 'Failed to assign stories' })
  }
})

router.post('/:id/generate', expensiveOpLimiter, async (req, res) => {
  try {
    const podcast = await podcastService.generateScript(req.params.id)
    res.json(podcast)
  } catch (err: any) {
    if (err.message === 'Podcast not found') {
      res.status(404).json({ error: err.message })
      return
    }
    if (err.message === 'No stories assigned') {
      res.status(400).json({ error: err.message })
      return
    }
    log.error({ err }, 'failed to generate podcast script')
    res.status(500).json({ error: 'Failed to generate podcast script' })
  }
})

export default router
