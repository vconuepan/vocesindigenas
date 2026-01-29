import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.js'
import issueRouter from './issues.js'
import feedRouter from './feeds.js'
import storyRouter from './stories.js'
import jobRouter from './jobs.js'
import newsletterRouter from './newsletters.js'
import podcastRouter from './podcasts.js'
import userRouter from './users.js'

const router = Router()

// All admin routes require authentication
router.use(requireAuth)

router.use('/issues', issueRouter)
router.use('/feeds', feedRouter)
router.use('/stories', storyRouter)
router.use('/jobs', jobRouter)
router.use('/newsletters', newsletterRouter)
router.use('/podcasts', podcastRouter)
router.use('/users', userRouter)

export default router
