import { Router } from 'express'
import { requireAdmin } from '../../middleware/auth.js'

const router = Router()

// All admin routes require authentication
router.use(requireAdmin)

// Placeholder — admin CRUD routes will be added in Phase 1
router.get('/status', (_req, res) => {
  res.json({ status: 'admin API operational' })
})

export default router
