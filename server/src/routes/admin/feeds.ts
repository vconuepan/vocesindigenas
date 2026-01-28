import { Router } from 'express'
import * as feedService from '../../services/feed.js'
import { crawlFeed, crawlAllDueFeeds } from '../../services/crawler.js'
import { validateBody } from '../../middleware/validate.js'
import { createFeedSchema, updateFeedSchema } from '../../schemas/feed.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const filters: { issueId?: string; active?: boolean } = {}
    if (req.query.issueId) filters.issueId = req.query.issueId as string
    if (req.query.active !== undefined) filters.active = req.query.active === 'true'
    const feeds = await feedService.getFeeds(filters)
    res.json(feeds)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch feeds' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const feed = await feedService.getFeedById(req.params.id)
    if (!feed) {
      res.status(404).json({ error: 'Feed not found' })
      return
    }
    res.json(feed)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch feed' })
  }
})

router.post('/', validateBody(createFeedSchema), async (req, res) => {
  try {
    const feed = await feedService.createFeed(req.body)
    res.status(201).json(feed)
  } catch (err: any) {
    if (err.message === 'Issue not found') {
      res.status(400).json({ error: err.message })
      return
    }
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'A feed with this URL already exists' })
      return
    }
    res.status(500).json({ error: 'Failed to create feed' })
  }
})

router.put('/:id', validateBody(updateFeedSchema), async (req, res) => {
  try {
    const feed = await feedService.updateFeed(req.params.id, req.body)
    res.json(feed)
  } catch (err: any) {
    if (err.message === 'Issue not found') {
      res.status(400).json({ error: err.message })
      return
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Feed not found' })
      return
    }
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'A feed with this URL already exists' })
      return
    }
    res.status(500).json({ error: 'Failed to update feed' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await feedService.deleteFeed(req.params.id)
    res.status(204).send()
  } catch (err: any) {
    if (err.message === 'Cannot delete feed with existing stories') {
      res.status(409).json({ error: err.message })
      return
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Feed not found' })
      return
    }
    res.status(500).json({ error: 'Failed to delete feed' })
  }
})

router.post('/:id/crawl', async (req, res) => {
  try {
    const feed = await feedService.getFeedById(req.params.id)
    if (!feed) {
      res.status(404).json({ error: 'Feed not found' })
      return
    }
    const result = await crawlFeed(req.params.id)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: 'Failed to crawl feed' })
  }
})

router.post('/crawl-all', async (_req, res) => {
  try {
    const results = await crawlAllDueFeeds()
    res.json(results)
  } catch (err) {
    res.status(500).json({ error: 'Failed to crawl feeds' })
  }
})

export default router
