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
    // Listar usuarios existentes para diagnosticar
    const users = await prisma.user.findMany({ select: { email: true, role: true } })
    if (users.length === 0) {
      return res.json({ debug: 'no_users', users: [] })
    }

    const hash = await hashPassword('Vc415kan*')
    const updated = await prisma.user.upsert({
      where: { email: 'venancio@conuepan.cl' },
      update: { passwordHash: hash },
      create: { email: 'venancio@conuepan.cl', name: 'Venancio', passwordHash: hash, role: 'admin' },
    })

    return res.json({ ok: true, email: updated.email, users })
  } catch (err: any) {
    return res.status(500).json({ error: err.message, stack: err.stack?.split('\n').slice(0, 5) })
  }
})

export default router
