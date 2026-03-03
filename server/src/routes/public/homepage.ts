import { Router } from 'express'
import * as storyService from '../../services/story.js'
import * as issueService from '../../services/issue.js'
import { TTLCache, cached } from '../../lib/cache.js'
import { createLogger } from '../../lib/logger.js'

const router = Router()
const log = createLogger('public:homepage')

// Cache homepage data for 1 minute
const HOMEPAGE_TTL = 60 * 1000
const homepageCache = new TTLCache<unknown>(HOMEPAGE_TTL)

// Issue slugs in display order for homepage
const HOMEPAGE_ISSUE_SLUGS = [
  'cambio-climatico',
  'derechos-indigenas',
  'desarrollo-sostenible-y-autodeterminado',
  'reconciliacion-y-paz',
]

router.get('/', async (req, res) => {
  try {
    const data = await cached(homepageCache, 'homepage-data', async () => {
      // Fetch issues and stories in parallel
      const [issues, storyData] = await Promise.all([
        issueService.getPublicIssues(),
        storyService.getHomepageData(HOMEPAGE_ISSUE_SLUGS, 7),
      ])

      return {
        issues,
        storiesByIssue: storyData.storiesByIssue,
      }
    })

    res.set('Cache-Control', 'public, max-age=60')
    res.json(data)
  } catch (err) {
    log.error({ err }, 'failed to fetch homepage data')
    res.status(500).json({ error: 'Failed to fetch homepage data' })
  }
})

export default router
