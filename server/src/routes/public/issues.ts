import { Router } from 'express'
import * as issueService from '../../services/issue.js'
import { TTLCache, cached } from '../../lib/cache.js'

const router = Router()

const ISSUES_TTL = 5 * 60 * 1000 // 5 minutes
const issuesCache = new TTLCache<unknown>(ISSUES_TTL)

router.get('/', async (_req, res) => {
  try {
    const issues = await cached(issuesCache, 'public-issues', () =>
      issueService.getPublicIssues()
    )
    res.json(issues)
  } catch (err) {
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
    res.status(500).json({ error: 'Failed to fetch issue' })
  }
})

export default router
