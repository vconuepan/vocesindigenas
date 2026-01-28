import { Router } from 'express'
import * as storyService from '../../services/story.js'
import { validateBody, validateQuery } from '../../middleware/validate.js'
import {
  createStorySchema,
  updateStorySchema,
  updateStoryStatusSchema,
  bulkUpdateStatusSchema,
  storyQuerySchema,
} from '../../schemas/story.js'

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
