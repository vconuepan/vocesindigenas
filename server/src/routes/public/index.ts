import { Router } from 'express'
import { apiLimiter } from '../../middleware/rateLimit.js'
import storiesRouter from './stories.js'
import issuesRouter from './issues.js'
import feedRouter from './feed.js'

const router = Router()

// Apply rate limiting to public API
router.use(apiLimiter)

router.use('/stories', storiesRouter)
router.use('/issues', issuesRouter)
router.use('/feed', feedRouter)

export default router
