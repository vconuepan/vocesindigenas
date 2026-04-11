import { Router } from 'express'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import issueRouter from './issues.js'
import feedRouter from './feeds.js'
import storyRouter from './stories.js'
import jobRouter from './jobs.js'
import newsletterRouter from './newsletters.js'
import { podcastRouter } from './podcasts.js'
import userRouter from './users.js'
import clusterRouter from './clusters.js'
import blueskyRouter from './bluesky.js'
import mastodonRouter from './mastodon.js'
import instagramRouter from './instagram.js'
import feedbackRouter from './feedback.js'

const router = Router()

// All admin routes require authentication + admin or editor role
router.use(requireAuth, requireRole('admin', 'editor'))

router.use('/issues', issueRouter)
router.use('/feeds', feedRouter)
router.use('/stories', storyRouter)
router.use('/jobs', jobRouter)
router.use('/newsletters', newsletterRouter)
router.use('/podcasts', podcastRouter)
router.use('/users', userRouter)
router.use('/clusters', clusterRouter)
router.use('/bluesky', blueskyRouter)
router.use('/mastodon', mastodonRouter)
router.use('/instagram', instagramRouter)
router.use('/feedback', feedbackRouter)

export default router
