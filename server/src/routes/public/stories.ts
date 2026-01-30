import { Router } from 'express'
import * as storyService from '../../services/story.js'
import { validateQuery } from '../../middleware/validate.js'
import { publicStoryQuerySchema } from '../../schemas/story.js'

const router = Router()

router.get('/', validateQuery(publicStoryQuerySchema), async (req, res) => {
  try {
    const query = (req as any).parsedQuery
    const result = await storyService.getPublishedStories({
      page: query.page,
      pageSize: query.pageSize,
      issueSlug: query.issueSlug,
    })
    res.json(result)
  } catch (err) {
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
    res.json(story)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch story' })
  }
})

export default router
