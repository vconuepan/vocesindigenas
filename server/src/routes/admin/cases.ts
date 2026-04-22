/**
 * Admin CRUD for OngoingCase — /api/admin/cases
 */
import { Router } from 'express'
import { z } from 'zod'
import prisma from '../../lib/prisma.js'
import { validateBody } from '../../middleware/validate.js'
import { createLogger } from '../../lib/logger.js'

const router = Router()
const log = createLogger('admin:cases')

const caseSchema = z.object({
  title:       z.string().min(1).max(255),
  slug:        z.string().min(1).max(255).regex(/^[a-z0-9-]+$/),
  description: z.string().max(2000).optional().nullable(),
  keywords:    z.array(z.string().min(1)).default([]),
  status:      z.enum(['active', 'archived']).default('active'),
  imageUrl:    z.string().url().optional().nullable(),
})

const partialCaseSchema = caseSchema.partial()

router.get('/', async (_req, res) => {
  try {
    const cases = await prisma.ongoingCase.findMany({
      orderBy: { createdAt: 'desc' },
    })
    res.json(cases)
  } catch (err) {
    log.error({ err }, 'failed to list cases')
    res.status(500).json({ error: 'Failed to list cases' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const c = await prisma.ongoingCase.findUnique({ where: { id: req.params.id } })
    if (!c) { res.status(404).json({ error: 'Case not found' }); return }
    res.json(c)
  } catch (err) {
    log.error({ err }, 'failed to get case')
    res.status(500).json({ error: 'Failed to get case' })
  }
})

router.post('/', validateBody(caseSchema), async (req, res) => {
  try {
    const c = await prisma.ongoingCase.create({ data: req.body })
    res.status(201).json(c)
  } catch (err: any) {
    if (err.code === 'P2002') { res.status(409).json({ error: 'Slug already exists' }); return }
    log.error({ err }, 'failed to create case')
    res.status(500).json({ error: 'Failed to create case' })
  }
})

router.put('/:id', validateBody(partialCaseSchema), async (req, res) => {
  try {
    const c = await prisma.ongoingCase.update({ where: { id: req.params.id }, data: req.body })
    res.json(c)
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Case not found' }); return }
    if (err.code === 'P2002') { res.status(409).json({ error: 'Slug already exists' }); return }
    log.error({ err }, 'failed to update case')
    res.status(500).json({ error: 'Failed to update case' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await prisma.ongoingCase.delete({ where: { id: req.params.id } })
    res.status(204).send()
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Case not found' }); return }
    log.error({ err }, 'failed to delete case')
    res.status(500).json({ error: 'Failed to delete case' })
  }
})

export default router
