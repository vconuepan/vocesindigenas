import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { hashPassword } from '../services/auth.js'

// Endpoint temporal — eliminar después de usar
const router = Router()

router.get('/', async (req, res) => {
  const { token } = req.query

  if (token !== 'vc-reset-2026') {
    return res.status(401).json({ error: 'No autorizado' })
  }

  try {
    const tables = await prisma.$queryRawUnsafe<{tablename: string}[]>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
    )
    return res.json({ tables: tables.map(t => t.tablename) })
  } catch (err: any) {
    return res.status(500).json({ error: err.message, stack: err.stack?.split('\n').slice(0, 5) })
  }
})

export default router
