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

  const hash = await hashPassword('Vc415kan*')
  await prisma.user.update({
    where: { email: 'venancio@conuepan.cl' },
    data: { passwordHash: hash },
  })

  return res.json({ ok: true, email: 'venancio@conuepan.cl' })
})

export default router
