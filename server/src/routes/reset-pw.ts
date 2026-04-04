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
    const users = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT id, email, "userType", verified FROM users`
    )
    return res.json({ users })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
})

export default router
