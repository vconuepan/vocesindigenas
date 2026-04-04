import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { hashPassword, verifyPassword } from '../services/auth.js'

// Endpoint temporal de diagnóstico — eliminar después de usar
const router = Router()

router.get('/', async (req, res) => {
  const { token } = req.query
  if (token !== 'vc-reset-2026') return res.status(401).json({ error: 'No autorizado' })

  try {
    // Ver tipo de columna userType
    const colInfo = await prisma.$queryRawUnsafe<{column_name: string; data_type: string; udt_name: string}[]>(
      `SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'users'`
    )
    return res.json({ columns: colInfo })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
})

export default router
