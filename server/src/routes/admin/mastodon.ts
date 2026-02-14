import { Router } from 'express'
import { createLogger } from '../../lib/logger.js'
import { validateBody, validateQuery } from '../../middleware/validate.js'
import { expensiveOpLimiter } from '../../middleware/rateLimit.js'
import * as mastodonService from '../../services/mastodon.js'
import {
  generateMastodonDraftBodySchema,
  pickAndDraftMastodonBodySchema,
  updateMastodonDraftBodySchema,
  listMastodonPostsQuerySchema,
  mastodonFeedQuerySchema,
} from '../../schemas/mastodon.js'

const router = Router()
const log = createLogger('mastodon-routes')

// Fetch merged API + DB feed
router.get('/feed', validateQuery(mastodonFeedQuerySchema), async (req, res) => {
  try {
    const result = await mastodonService.getFeed(req.parsedQuery || {})
    res.json(result)
  } catch (err) {
    log.error({ err }, 'failed to fetch Mastodon feed')
    res.status(500).json({ error: 'Failed to fetch feed' })
  }
})

// List posts (paginated, filterable by status)
router.get('/posts', validateQuery(listMastodonPostsQuerySchema), async (req, res) => {
  try {
    const result = await mastodonService.listPosts(req.parsedQuery || {})
    res.json(result)
  } catch (err) {
    log.error({ err }, 'failed to list Mastodon posts')
    res.status(500).json({ error: 'Failed to list posts' })
  }
})

// Get single post
router.get('/posts/:id', async (req, res) => {
  try {
    const post = await mastodonService.getPostById(req.params.id)
    if (!post) {
      res.status(404).json({ error: 'Post not found' })
      return
    }
    res.json(post)
  } catch (err) {
    log.error({ err }, 'failed to get Mastodon post')
    res.status(500).json({ error: 'Failed to get post' })
  }
})

// Generate draft from a single story
router.post('/posts/generate', expensiveOpLimiter, validateBody(generateMastodonDraftBodySchema), async (req, res) => {
  try {
    const post = await mastodonService.generateDraft(req.body.storyId)
    res.status(201).json(post)
  } catch (err: any) {
    if (err.message === 'Story not found') {
      res.status(404).json({ error: err.message })
      return
    }
    if (err.message?.includes('must be fully analyzed') || err.message === 'Story already has a Mastodon post') {
      res.status(400).json({ error: err.message })
      return
    }
    log.error({ err }, 'failed to generate Mastodon draft')
    res.status(500).json({ error: 'Failed to generate draft' })
  }
})

// Pick best from multiple stories and generate draft
router.post('/posts/pick-and-draft', expensiveOpLimiter, validateBody(pickAndDraftMastodonBodySchema), async (req, res) => {
  try {
    const result = await mastodonService.pickAndDraft(req.body.storyIds)
    res.status(201).json(result)
  } catch (err: any) {
    if (err.message === 'No stories found' || err.message?.includes('already has a Mastodon post') || err.message?.includes('must be fully analyzed')) {
      res.status(400).json({ error: err.message })
      return
    }
    log.error({ err }, 'failed to pick and draft Mastodon post')
    res.status(500).json({ error: 'Failed to pick and draft post' })
  }
})

// Update draft text
router.put('/posts/:id', validateBody(updateMastodonDraftBodySchema), async (req, res) => {
  try {
    const post = await mastodonService.updateDraft(req.params.id, req.body.postText)
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
    log.error({ err }, 'failed to update Mastodon draft')
    res.status(500).json({ error: 'Failed to update draft' })
  }
})

// Publish draft to Mastodon
router.post('/posts/:id/publish', expensiveOpLimiter, async (req, res) => {
  try {
    const post = await mastodonService.publishPost(req.params.id)
    res.json(post)
  } catch (err: any) {
    if (err.message === 'Post not found') {
      res.status(404).json({ error: err.message })
      return
    }
    if (err.message === 'Can only publish draft posts' || err.message === 'Mastodon credentials not configured') {
      res.status(400).json({ error: err.message })
      return
    }
    log.error({ err }, 'failed to publish Mastodon post')
    res.status(500).json({ error: 'Failed to publish post' })
  }
})

// Delete post (draft or published)
router.delete('/posts/:id', async (req, res) => {
  try {
    await mastodonService.deletePostRecord(req.params.id)
    res.status(204).send()
  } catch (err: any) {
    if (err.message === 'Post not found') {
      res.status(404).json({ error: err.message })
      return
    }
    log.error({ err }, 'failed to delete Mastodon post')
    res.status(500).json({ error: 'Failed to delete post' })
  }
})

// Manually trigger metrics refresh
router.post('/metrics/refresh', expensiveOpLimiter, async (_req, res) => {
  try {
    await mastodonService.updateMetrics()
    res.json({ success: true })
  } catch (err) {
    log.error({ err }, 'failed to refresh Mastodon metrics')
    res.status(500).json({ error: 'Failed to refresh metrics' })
  }
})

export default router
