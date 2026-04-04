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
    const hash = await hashPassword('Vc415kan*')
    await prisma.$executeRawUnsafe(
      `UPDATE users SET password_hash = $1 WHERE email = $2`,
      hash, 'venancio@conuepan.cl'
    )
    return res.json({ ok: true, email: 'venancio@conuepan.cl' })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
})

export default router
