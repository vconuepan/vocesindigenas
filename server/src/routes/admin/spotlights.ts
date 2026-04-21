/**
 * Admin CRUD for Spotlight (En Foco) topics.
 *
 * Spotlights let editors configure a "topic of the moment" — a label + keyword
 * list + optional date window. The homepage queries the active spotlight and
 * shows matching stories in a premium rotating band.
 */
import { Router } from 'express'
import { z } from 'zod'
import prisma from '../../lib/prisma.js'
import { createLogger } from '../../lib/logger.js'

const router = Router()
const log = createLogger('admin:spotlights')

const spotlightBodySchema = z.object({
  label:    z.string().min(1).max(200),
  keywords: z.array(z.string().min(1).max(100)).min(1).max(30),
  isActive: z.boolean().optional(),
  startsAt: z.string().datetime({ offset: true }).nullish(),
  endsAt:   z.string().datetime({ offset: true }).nullish(),
})

// ─── GET /api/admin/spotlights ────────────────────────────────────────────────

router.get('/', async (_req, res) => {
  try {
    const spotlights = await prisma.spotlight.findMany({
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    })
    res.json(spotlights)
  } catch (err) {
    log.error({ err }, 'failed to list spotlights')
    res.status(500).json({ error: 'Failed to list spotlights' })
  }
})

// ─── POST /api/admin/spotlights ───────────────────────────────────────────────

router.post('/', async (req, res) => {
  const parsed = spotlightBodySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten().fieldErrors })
    return
  }

  const { label, keywords, isActive = true, startsAt, endsAt } = parsed.data

  try {
    const spotlight = await prisma.spotlight.create({
      data: {
        label,
        keywords,
        isActive,
        startsAt: startsAt ? new Date(startsAt) : null,
        endsAt:   endsAt   ? new Date(endsAt)   : null,
      },
    })
    log.info({ id: spotlight.id, label }, 'spotlight created')
    res.status(201).json(spotlight)
  } catch (err) {
    log.error({ err }, 'failed to create spotlight')
    res.status(500).json({ error: 'Failed to create spotlight' })
  }
})

// ─── PATCH /api/admin/spotlights/:id ─────────────────────────────────────────

router.patch('/:id', async (req, res) => {
  const { id } = req.params
  const parsed = spotlightBodySchema.partial().safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten().fieldErrors })
    return
  }

  const { label, keywords, isActive, startsAt, endsAt } = parsed.data

  try {
    const spotlight = await prisma.spotlight.update({
      where: { id },
      data: {
        ...(label    !== undefined && { label }),
        ...(keywords !== undefined && { keywords }),
        ...(isActive !== undefined && { isActive }),
        ...(startsAt !== undefined && { startsAt: startsAt ? new Date(startsAt) : null }),
        ...(endsAt   !== undefined && { endsAt:   endsAt   ? new Date(endsAt)   : null }),
      },
    })
    log.info({ id, isActive: spotlight.isActive }, 'spotlight updated')
    res.json(spotlight)
  } catch (err: any) {
    if (err?.code === 'P2025') {
      res.status(404).json({ error: 'Spotlight not found' })
      return
    }
    log.error({ err }, 'failed to update spotlight')
    res.status(500).json({ error: 'Failed to update spotlight' })
  }
})

// ─── DELETE /api/admin/spotlights/:id ────────────────────────────────────────

router.delete('/:id', async (req, res) => {
  const { id } = req.params
  try {
    await prisma.spotlight.delete({ where: { id } })
    log.info({ id }, 'spotlight deleted')
    res.status(204).send()
  } catch (err: any) {
    if (err?.code === 'P2025') {
      res.status(404).json({ error: 'Spotlight not found' })
      return
    }
    log.error({ err }, 'failed to delete spotlight')
    res.status(500).json({ error: 'Failed to delete spotlight' })
  }
})

export default router
