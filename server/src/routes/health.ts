import { Router } from 'express'
import { Prisma } from '@prisma/client'
import prisma from '../lib/prisma.js'

const router = Router()

router.get('/', async (_req, res) => {
  try {
    await prisma.$queryRaw(Prisma.sql`SELECT 1`)
    res.json({
      status: 'ok',
      database: 'connected',
      uptime: process.uptime(),
    })
  } catch {
    res.status(503).json({ status: 'error', database: 'disconnected' })
  }
})

export default router
