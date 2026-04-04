import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { hashPassword, verifyPassword } from '../services/auth.js'

// Endpoint temporal de diagnóstico — eliminar después de usar
const router = Router()

router.get('/', async (req, res) => {
  const { token } = req.query
  if (token !== 'vc-reset-2026') return res.status(401).json({ error: 'No autorizado' })

  try {
    // 1. Buscar usuario
    const user = await prisma.user.findUnique({ where: { email: 'venancio@conuepan.cl' } })
    if (!user) return res.json({ error: 'usuario no encontrado' })

    // 2. Verificar contraseña
    const valid = await verifyPassword('Vc415kan*', user.passwordHash)
    if (!valid) {
      // Resetear contraseña
      const hash = await hashPassword('Vc415kan*')
      await prisma.$executeRawUnsafe(`UPDATE users SET "passwordHash" = $1 WHERE email = $2`, hash, 'venancio@conuepan.cl')
      return res.json({ reset: true, msg: 'contraseña reseteada, intenta de nuevo' })
    }

    // 3. Intentar crear refresh token
    const cols = await prisma.$queryRawUnsafe<{column_name: string}[]>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'refresh_tokens'`
    )
    return res.json({ passwordOk: true, userType: user.userType, refreshTokenCols: cols.map(c => c.column_name) })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
})

export default router
