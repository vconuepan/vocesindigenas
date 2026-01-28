import { Router } from 'express'
import { apiLimiter } from '../../middleware/rateLimit.js'

const router = Router()

// Apply rate limiting to public API
router.use(apiLimiter)

// Placeholder — public story endpoints will be added in Phase 1
router.get('/stories', (_req, res) => {
  res.json({ data: [], total: 0, page: 1, pageSize: 25, totalPages: 0 })
})

export default router
