import { Router } from 'express'
import { createLogger } from '../../lib/logger.js'
import { validateBody, validateQuery } from '../../middleware/validate.js'
import { expensiveOpLimiter } from '../../middleware/rateLimit.js'
import * as blueskyService from '../../services/bluesky.js'
import {
  generateDraftBodySchema,
  pickAndDraftBodySchema,
  updateDraftBodySchema,
  listPostsQuerySchema,
  feedQuerySchema,
} from '../../schemas/bluesky.js'

const router = Router()
const log = createLogger('bluesky-routes')

// Fetch merged API + DB feed
router.get('/feed', validateQuery(feedQuerySchema), async (req, res) => {
  try {
    const result = await blueskyService.getFeed(req.parsedQuery || {})
    res.json(result)
  } catch (err) {
    log.error({ err }, 'failed to fetch Bluesky feed')
    res.status(500).json({ error: 'Failed to fetch feed' })
  }
})

// List posts (paginated, filterable by status)
router.get('/posts', validateQuery(listPostsQuerySchema), async (req, res) => {
  try {
    const result = await blueskyService.listPosts(req.parsedQuery || {})
    res.json(result)
  } catch (err) {
    log.error({ err }, 'failed to list Bluesky posts')
    res.status(500).json({ error: 'Failed to list posts' })
  }
})

// Get single post
router.get('/posts/:id', async (req, res) => {
  try {
    const post = await blueskyService.getPostById(req.params.id)
    if (!post) {
      res.status(404).json({ error: 'Post not found' })
      return
    }
    res.json(post)
  } catch (err) {
    log.error({ err }, 'failed to get Bluesky post')
    res.status(500).json({ error: 'Failed to get post' })
  }
})

// Generate draft from a single story
router.post('/posts/generate', expensiveOpLimiter, validateBody(generateDraftBodySchema), async (req, res) => {
  try {
    const post = await blueskyService.generateDraft(req.body.storyId)
    res.status(201).json(post)
  } catch (err: any) {
    if (err.message === 'Story not found') {
      res.status(404).json({ error: err.message })
      return
    }
    if (err.message?.includes('must be fully analyzed') || err.message === 'Story already has a Bluesky post') {
      res.status(400).json({ error: err.message })
      return
    }
    log.error({ err }, 'failed to generate Bluesky draft')
    res.status(500).json({ error: 'Failed to generate draft' })
  }
})

// Pick best from multiple stories and generate draft
router.post('/posts/pick-and-draft', expensiveOpLimiter, validateBody(pickAndDraftBodySchema), async (req, res) => {
  try {
    const result = await blueskyService.pickAndDraft(req.body.storyIds)
    res.status(201).json(result)
  } catch (err: any) {
    if (err.message === 'No stories found' || err.message?.includes('already have a Bluesky post')) {
      res.status(400).json({ error: err.message })
      return
    }
    log.error({ err }, 'failed to pick and draft Bluesky post')
    res.status(500).json({ error: 'Failed to pick and draft post' })
  }
})

// Update draft text
router.put('/posts/:id', validateBody(updateDraftBodySchema), async (req, res) => {
  try {
    const post = await blueskyService.updateDraft(req.params.id, req.body.postText)
    res.json(post)
  } catch (err: any) {
    if (err.message === 'Post not found') {
      res.status(404).json({ error: err.message })
      return
    }
    if (err.message === 'Can only edit draft posts') {
      res.status(400).json({ error: err.message })
      return
    }
    log.error({ err }, 'failed to update Bluesky draft')
    res.status(500).json({ error: 'Failed to update draft' })
  }
})

// Publish draft to Bluesky
router.post('/posts/:id/publish', expensiveOpLimiter, async (req, res) => {
  try {
    const post = await blueskyService.publishPost(req.params.id)
    res.json(post)
  } catch (err: any) {
    if (err.message === 'Post not found') {
      res.status(404).json({ error: err.message })
      return
    }
    if (err.message === 'Can only publish draft posts' || err.message === 'Bluesky credentials not configured') {
      res.status(400).json({ error: err.message })
      return
    }
    log.error({ err }, 'failed to publish Bluesky post')
    res.status(500).json({ error: 'Failed to publish post' })
  }
})

// Delete post (draft or published)
router.delete('/posts/:id', async (req, res) => {
  try {
    await blueskyService.deletePostRecord(req.params.id)
    res.status(204).send()
  } catch (err: any) {
    if (err.message === 'Post not found') {
      res.status(404).json({ error: err.message })
      return
    }
    log.error({ err }, 'failed to delete Bluesky post')
    res.status(500).json({ error: 'Failed to delete post' })
  }
})

// Manually trigger metrics refresh
router.post('/metrics/refresh', expensiveOpLimiter, async (_req, res) => {
  try {
    await blueskyService.updateMetrics()
    res.json({ success: true })
  } catch (err) {
    log.error({ err }, 'failed to refresh Bluesky metrics')
    res.status(500).json({ error: 'Failed to refresh metrics' })
  }
})

export default router
