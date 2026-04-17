import { Router } from 'express'
import { createLogger } from '../../lib/logger.js'
import { validateBody, validateQuery } from '../../middleware/validate.js'
import { expensiveOpLimiter } from '../../middleware/rateLimit.js'
import * as instagramService from '../../services/instagram.js'
import {
  generateInstagramDraftBodySchema,
  updateInstagramDraftBodySchema,
  listInstagramPostsQuerySchema,
} from '../../schemas/instagram.js'

const router = Router()
const log = createLogger('instagram-routes')

// List posts (paginated, filterable by status)
router.get('/posts', validateQuery(listInstagramPostsQuerySchema), async (req, res) => {
  try {
    const result = await instagramService.listPosts(req.parsedQuery || {})
    res.json(result)
  } catch (err) {
    log.error({ err }, 'failed to list Instagram posts')
    res.status(500).json({ error: 'Failed to list posts' })
  }
})

// Get single post
router.get('/posts/:id', async (req, res) => {
  try {
    const post = await instagramService.getPostById(req.params.id)
    if (!post) {
      res.status(404).json({ error: 'Post not found' })
      return
    }
    res.json(post)
  } catch (err) {
    log.error({ err }, 'failed to get Instagram post')
    res.status(500).json({ error: 'Failed to get post' })
  }
})

// Generate draft from a single story
router.post('/posts/generate', expensiveOpLimiter, validateBody(generateInstagramDraftBodySchema), async (req, res) => {
  try {
    const post = await instagramService.generateDraft(req.body.storyId)
    res.status(201).json(post)
  } catch (err: any) {
    if (err.message === 'Story not found') {
      res.status(404).json({ error: err.message })
      return
    }
    if (err.message?.includes('must be fully analyzed') || err.message === 'Story already has an Instagram post') {
      res.status(400).json({ error: err.message })
      return
    }
    log.error({ err }, 'failed to generate Instagram draft')
    res.status(500).json({ error: 'Failed to generate draft' })
  }
})

// Update draft caption
router.put('/posts/:id', validateBody(updateInstagramDraftBodySchema), async (req, res) => {
  try {
    const post = await instagramService.updateDraft(req.params.id, req.body.caption)
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
    log.error({ err }, 'failed to update Instagram draft')
    res.status(500).json({ error: 'Failed to update draft' })
  }
})

// Publish draft to Instagram
router.post('/posts/:id/publish', expensiveOpLimiter, async (req, res) => {
  try {
    const post = await instagramService.publishPost(req.params.id)
    res.json(post)
  } catch (err: any) {
    if (err.message === 'Post not found') {
      res.status(404).json({ error: err.message })
      return
    }
    if (err.message === 'Can only publish draft posts' || err.message === 'Instagram credentials not configured') {
      res.status(400).json({ error: err.message })
      return
    }
    log.error({ err }, 'failed to publish Instagram post')
    res.status(500).json({ error: 'Failed to publish post' })
  }
})

// Delete post record (DB only)
router.delete('/posts/:id', async (req, res) => {
  try {
    await instagramService.deletePostRecord(req.params.id)
    res.status(204).send()
  } catch (err: any) {
    if (err.message === 'Post not found') {
      res.status(404).json({ error: err.message })
      return
    }
    log.error({ err }, 'failed to delete Instagram post')
    res.status(500).json({ error: 'Failed to delete post' })
  }
})

// Manually trigger metrics refresh
router.post('/metrics/refresh', expensiveOpLimiter, async (_req, res) => {
  try {
    await instagramService.updateMetrics()
    res.json({ success: true })
  } catch (err) {
    log.error({ err }, 'failed to refresh Instagram metrics')
    res.status(500).json({ error: 'Failed to refresh metrics' })
  }
})

export default router
