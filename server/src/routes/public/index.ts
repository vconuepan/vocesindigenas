import { Router } from 'express'
import { apiLimiter } from '../../middleware/rateLimit.js'
import storiesRouter from './stories.js'
import issuesRouter from './issues.js'
import feedRouter from './feed.js'
import subscribeRouter from './subscribe.js'
import sitemapRouter from './sitemap.js'
import homepageRouter from './homepage.js'
import docsRouter from './docs.js'
import sourcesRouter from './sources.js'
import feedbackRouter from './feedback.js'
import podcastFeedRouter from './podcastFeed.js'
import communitiesRouter from './communities.js'

const router = Router()

// Apply rate limiting to public API
router.use(apiLimiter)

router.use('/homepage', homepageRouter)
router.use('/stories', storiesRouter)
router.use('/issues', issuesRouter)
router.use('/sources', sourcesRouter)
router.use('/feed', feedRouter)
router.use('/subscribe', subscribeRouter)
router.use('/sitemap.xml', sitemapRouter)
router.use('/docs', docsRouter)
router.use('/feedback', feedbackRouter)
router.use('/podcast', podcastFeedRouter)
router.use('/communities', communitiesRouter)

export default router
