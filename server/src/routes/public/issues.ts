import { Router } from 'express'
import * as issueService from '../../services/issue.js'
import { TTLCache, cached } from '../../lib/cache.js'
import { createLogger } from '../../lib/logger.js'

const router = Router()
const log = createLogger('public:issues')

const ISSUES_TTL = 5 * 60 * 1000 // 5 minutes
const issuesCache = new TTLCache<unknown>(ISSUES_TTL)

router.get('/', async (_req, res) => {
  try {
    const issues = await cached(issuesCache, 'public-issues', () =>
      issueService.getPublicIssues()
    )
    res.json(issues)
  } catch (err) {
    log.error({ err }, 'failed to fetch issues')
    res.status(500).json({ error: 'Failed to fetch issues' })
  }
})

router.get('/:slug', async (req, res) => {
  try {
    const issue = await issueService.getPublicIssueBySlug(req.params.slug)
    if (!issue) {
      res.status(404).json({ error: 'Issue not found' })
      return
    }
    res.json(issue)
  } catch (err) {
    log.error({ err, slug: req.params.slug }, 'failed to fetch issue')
    res.status(500).json({ error: 'Failed to fetch issue' })
  }
})

export default router
