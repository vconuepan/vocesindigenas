import { Router } from 'express'
import { apiLimiter } from '../../middleware/rateLimit.js'
import storiesRouter from './stories.js'

const router = Router()

// Apply rate limiting to public API
router.use(apiLimiter)

router.use('/stories', storiesRouter)

export default router
