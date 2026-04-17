import { Router } from 'express'
import prisma from '../../lib/prisma.js'

const router = Router()

// POST /api/track
// Lightweight page view counter — no cookies, no PII stored.
// Increments a daily counter per path.
router.post('/', async (req, res) => {
  // Always respond immediately so the client isn't blocked
  res.json({ ok: true })

  try {
    const { path } = req.body as { path?: unknown }
    if (!path || typeof path !== 'string') return
    // Ignore admin routes and API calls
    if (path.startsWith('/admin') || path.startsWith('/api')) return

    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)

    await prisma.pageView.upsert({
      where: { path_date: { path: path.slice(0, 500), date: today } },
      update: { count: { increment: 1 } },
      create: { path: path.slice(0, 500), date: today, count: 1 },
    })
  } catch {
    // Silently ignore errors — analytics should never break the app
  }
})

export default router
