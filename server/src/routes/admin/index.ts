import { Router } from 'express'
import { requireAdmin } from '../../middleware/auth.js'
import issueRouter from './issues.js'
import feedRouter from './feeds.js'
import storyRouter from './stories.js'

const router = Router()

// All admin routes require authentication
router.use(requireAdmin)

router.use('/issues', issueRouter)
router.use('/feeds', feedRouter)
router.use('/stories', storyRouter)

export default router
