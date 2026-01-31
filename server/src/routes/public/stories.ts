import { Router } from 'express'
import * as storyService from '../../services/story.js'
import { validateQuery } from '../../middleware/validate.js'
import { publicStoryQuerySchema } from '../../schemas/story.js'
import { createLogger } from '../../lib/logger.js'

const router = Router()
const log = createLogger('public:stories')

router.get('/', validateQuery(publicStoryQuerySchema), async (req, res) => {
  try {
    const query = req.parsedQuery
    const result = await storyService.getPublishedStories({
      page: query.page,
      pageSize: query.pageSize,
      issueSlug: query.issueSlug,
    })
    res.set('Cache-Control', 'public, max-age=60')
    res.json(result)
  } catch (err) {
    log.error({ err }, 'failed to fetch stories')
    res.status(500).json({ error: 'Failed to fetch stories' })
  }
})

router.get('/:slug', async (req, res) => {
  try {
    const story = await storyService.getPublishedStoryBySlug(req.params.slug)
    if (!story) {
      res.status(404).json({ error: 'Story not found' })
      return
    }
    res.set('Cache-Control', 'public, max-age=60')
    res.json(story)
  } catch (err) {
    log.error({ err, slug: req.params.slug }, 'failed to fetch story')
    res.status(500).json({ error: 'Failed to fetch story' })
  }
})

export default router
