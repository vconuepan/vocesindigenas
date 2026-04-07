import { Router } from 'express'
import { z } from 'zod'
import { createLogger } from '../../lib/logger.js'
import * as feedService from '../../services/feed.js'
import { fetchFavicon, fetchAllFavicons } from '../../services/favicon.js'
import { crawlFeed, crawlAllDueFeeds } from '../../services/crawler.js'
import { validateBody, validateQuery } from '../../middleware/validate.js'
import { createFeedSchema, updateFeedSchema } from '../../schemas/feed.js'

const feedsQuerySchema = z.object({
  issueId: z.string().optional(),
  active: z.enum(['true', 'false']).optional(),
})

const router = Router()
const log = createLogger('feeds')

router.get('/', validateQuery(feedsQuerySchema), async (req, res) => {
  try {
    const filters: { issueId?: string; active?: boolean } = {}
    if (req.query.issueId) filters.issueId = req.query.issueId as string
    if (req.query.active !== undefined) filters.active = req.query.active === 'true'
    const feeds = await feedService.getFeeds(filters)
    res.json(feeds)
  } catch (err) {
    log.error({ err }, 'failed to fetch feeds')
    res.status(500).json({ error: 'Failed to fetch feeds' })
  }
})

router.get('/quality', async (_req, res) => {
  try {
    const metrics = await feedService.getAllFeedQualityMetrics()
    // Convert Map to plain object for JSON serialization
    const obj: Record<string, feedService.FeedQualityMetrics> = {}
    for (const [id, m] of metrics) obj[id] = m
    res.json(obj)
  } catch (err) {
    log.error({ err }, 'failed to fetch feed quality metrics')
    res.status(500).json({ error: 'Failed to fetch quality metrics' })
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
    log.error({ err }, 'failed to fetch feed')
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
      res.status(409).json({ error: 'A feed with this RSS URL already exists' })
      return
    }
    log.error({ err }, 'failed to create feed')
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
      res.status(409).json({ error: 'A feed with this RSS URL already exists' })
      return
    }
    log.error({ err }, 'failed to update feed')
    res.status(500).json({ error: 'Failed to update feed' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const result = await feedService.deleteFeed(req.params.id)
    const message = result.action === 'deleted'
      ? 'Feed deleted'
      : 'Feed deactivated (has linked stories)'
    res.json({ action: result.action, message })
  } catch (err: any) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Feed not found' })
      return
    }
    log.error({ err }, 'failed to delete feed')
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
    log.error({ err }, 'failed to crawl feed')
    res.status(500).json({ error: 'Failed to crawl feed' })
  }
})

router.post('/:id/favicon', async (req, res) => {
  try {
    const feed = await feedService.getFeedById(req.params.id)
    if (!feed) {
      res.status(404).json({ error: 'Feed not found' })
      return
    }
    const result = await fetchFavicon(feed.id, feed.rssUrl, feed.url, true)
    res.json(result)
  } catch (err) {
    log.error({ err }, 'failed to fetch favicon')
    res.status(500).json({ error: 'Failed to fetch favicon' })
  }
})

router.post('/fetch-favicons', async (_req, res) => {
  try {
    const result = await fetchAllFavicons()
    res.json(result)
  } catch (err) {
    log.error({ err }, 'failed to fetch favicons')
    res.status(500).json({ error: 'Failed to fetch favicons' })
  }
})

router.post('/crawl-all', async (_req, res) => {
  try {
    const results = await crawlAllDueFeeds()
    res.json(results)
  } catch (err) {
    log.error({ err }, 'failed to crawl all feeds')
    res.status(500).json({ error: 'Failed to crawl feeds' })
  }
})

export default router
