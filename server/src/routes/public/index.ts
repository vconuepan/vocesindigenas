import { Router } from 'express'
import { apiLimiter } from '../../middleware/rateLimit.js'
import storiesRouter from './stories.js'
import issuesRouter from './issues.js'
import feedRouter from './feed.js'
import subscribeRouter from './subscribe.js'
import sitemapRouter from './sitemap.js'
import homepageRouter from './homepage.js'

const router = Router()

// Apply rate limiting to public API
router.use(apiLimiter)

router.use('/homepage', homepageRouter)
router.use('/stories', storiesRouter)
router.use('/issues', issuesRouter)
router.use('/feed', feedRouter)
router.use('/subscribe', subscribeRouter)
router.use('/sitemap.xml', sitemapRouter)

export default router
