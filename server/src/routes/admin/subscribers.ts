import { Router } from 'express'
import prisma from '../../lib/prisma.js'
import { createLogger } from '../../lib/logger.js'

const router = Router()
const log = createLogger('admin:subscribers')

/**
 * GET /api/admin/subscribers?status=confirmed|pending|expired|all&page=1&pageSize=50
 */
router.get('/', async (req, res) => {
  const status = (req.query.status as string) || 'all'
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1)
  const pageSize = Math.min(200, Math.max(1, parseInt(req.query.pageSize as string, 10) || 50))

  const now = new Date()
  const where =
    status === 'confirmed'
      ? { confirmedAt: { not: null } }
      : status === 'pending'
      ? { confirmedAt: null, expiresAt: { gt: now } }
      : status === 'expired'
      ? { confirmedAt: null, expiresAt: { lte: now } }
      : {}

  const [total, subscribers] = await Promise.all([
    prisma.pendingSubscription.count({ where }),
    prisma.pendingSubscription.findMany({
      where,
      select: { id: true, email: true, confirmedAt: true, expiresAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  res.json({ data: subscribers, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
})

/**
 * GET /api/admin/subscribers/stats
 */
router.get('/stats', async (_req, res) => {
  const now = new Date()
  const [confirmed, pending, expired] = await Promise.all([
    prisma.pendingSubscription.count({ where: { confirmedAt: { not: null } } }),
    prisma.pendingSubscription.count({ where: { confirmedAt: null, expiresAt: { gt: now } } }),
    prisma.pendingSubscription.count({ where: { confirmedAt: null, expiresAt: { lte: now } } }),
  ])
  res.json({ confirmed, pending, expired, total: confirmed + pending + expired })
})

/**
 * DELETE /api/admin/subscribers/:id
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params
  try {
    await prisma.pendingSubscription.delete({ where: { id } })
    log.info({ id }, 'subscriber deleted by admin')
    res.json({ ok: true })
  } catch (err: unknown) {
    const code = (err as { code?: string }).code
    if (code === 'P2025') {
      res.status(404).json({ error: 'Subscriber not found' })
      return
    }
    log.error({ err }, 'failed to delete subscriber')
    res.status(500).json({ error: 'Failed to delete subscriber' })
  }
})

export default router
