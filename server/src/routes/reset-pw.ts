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
    const cols = await prisma.$queryRawUnsafe<{column_name: string}[]>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position`
    )
    return res.json({ columns: cols.map(c => c.column_name) })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
})

export default router
