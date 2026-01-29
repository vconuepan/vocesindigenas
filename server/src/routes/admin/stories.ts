import { Router } from 'express'
import * as storyService from '../../services/story.js'
import * as analysisService from '../../services/analysis.js'
import { crawlUrl } from '../../services/crawler.js'
import { validateBody, validateQuery } from '../../middleware/validate.js'
import {
  createStorySchema,
  updateStorySchema,
  updateStoryStatusSchema,
  bulkUpdateStatusSchema,
  storyQuerySchema,
  preassessBodySchema,
  selectBodySchema,
} from '../../schemas/story.js'
import { crawlUrlSchema } from '../../schemas/job.js'

const router = Router()

router.get('/stats', async (_req, res) => {
  try {
    const stats = await storyService.getStoryStats()
    res.json(stats)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch story stats' })
  }
})

router.get('/', validateQuery(storyQuerySchema), async (req, res) => {
  try {
    const filters = (req as any).parsedQuery
    const result = await storyService.getStories(filters)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stories' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const story = await storyService.getStoryById(req.params.id)
    if (!story) {
      res.status(404).json({ error: 'Story not found' })
      return
    }
    res.json(story)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch story' })
  }
})

router.post('/', validateBody(createStorySchema), async (req, res) => {
  try {
    const story = await storyService.createStory(req.body)
    res.status(201).json(story)
  } catch (err: any) {
    if (err.message === 'Feed not found') {
      res.status(400).json({ error: err.message })
      return
    }
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'A story with this URL already exists' })
      return
    }
    res.status(500).json({ error: 'Failed to create story' })
  }
})

router.put('/:id', validateBody(updateStorySchema), async (req, res) => {
  try {
    const story = await storyService.updateStory(req.params.id, req.body)
    res.json(story)
  } catch (err: any) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Story not found' })
      return
    }
    res.status(500).json({ error: 'Failed to update story' })
  }
})

router.put('/:id/status', validateBody(updateStoryStatusSchema), async (req, res) => {
  try {
    const story = await storyService.updateStoryStatus(req.params.id, req.body.status)
    res.json(story)
  } catch (err: any) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Story not found' })
      return
    }
    res.status(500).json({ error: 'Failed to update story status' })
  }
})

router.post('/bulk-status', validateBody(bulkUpdateStatusSchema), async (req, res) => {
  try {
    const result = await storyService.bulkUpdateStatus(req.body.ids, req.body.status)
    res.json({ updated: result.count })
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk update story status' })
  }
})

router.post('/preassess', validateBody(preassessBodySchema), async (req, res) => {
  try {
    let storyIds: string[]
    if (req.body.storyIds && req.body.storyIds.length > 0) {
      storyIds = req.body.storyIds
    } else {
      const fetched = await storyService.getStoriesByStatus('fetched')
      storyIds = fetched.map(s => s.id)
    }

    if (storyIds.length === 0) {
      res.json({ processed: 0, results: [] })
      return
    }

    const results = await analysisService.preAssessStories(storyIds)
    res.json({ processed: results.length, results })
  } catch (err) {
    res.status(500).json({ error: 'Failed to pre-assess stories' })
  }
})

router.post('/:id/assess', async (req, res) => {
  try {
    await analysisService.assessStory(req.params.id)
    const story = await storyService.getStoryById(req.params.id)
    res.json(story)
  } catch (err: any) {
    if (err.message === 'Story not found') {
      res.status(404).json({ error: err.message })
      return
    }
    res.status(500).json({ error: 'Failed to assess story' })
  }
})

router.post('/select', validateBody(selectBodySchema), async (req, res) => {
  try {
    const result = await analysisService.selectStories(req.body.storyIds)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: 'Failed to select stories' })
  }
})

router.post('/:id/publish', async (req, res) => {
  try {
    const story = await storyService.publishStory(req.params.id)
    res.json(story)
  } catch (err: any) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Story not found' })
      return
    }
    res.status(500).json({ error: 'Failed to publish story' })
  }
})

router.post('/:id/reject', async (req, res) => {
  try {
    const story = await storyService.rejectStory(req.params.id)
    res.json(story)
  } catch (err: any) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Story not found' })
      return
    }
    res.status(500).json({ error: 'Failed to reject story' })
  }
})

router.post('/crawl-url', validateBody(crawlUrlSchema), async (req, res) => {
  try {
    const result = await crawlUrl(req.body.url, req.body.feedId)
    if (!result) {
      res.status(422).json({ error: 'Could not extract content from URL' })
      return
    }
    res.status(201).json(result)
  } catch (err: any) {
    if (err.message === 'Feed not found') {
      res.status(404).json({ error: err.message })
      return
    }
    if (err.message === 'URL already crawled') {
      res.status(409).json({ error: err.message })
      return
    }
    res.status(500).json({ error: 'Failed to crawl URL' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await storyService.deleteStory(req.params.id)
    res.status(204).send()
  } catch (err: any) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Story not found' })
      return
    }
    res.status(500).json({ error: 'Failed to delete story' })
  }
})

export default router
