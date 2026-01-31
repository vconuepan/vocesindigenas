import { Router } from 'express'
import { validateBody } from '../middleware/validate.js'
import { loginSchema } from '../schemas/auth.js'
import { getUserByEmail } from '../services/user.js'
import {
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  verifyAccessToken,
} from '../services/auth.js'
import { getUserById } from '../services/user.js'
import { createLogger } from '../lib/logger.js'

const log = createLogger('auth')

const router = Router()

const REFRESH_COOKIE = 'refresh_token'
const COOKIE_MAX_AGE = 24 * 60 * 60 * 1000 // 24 hours

function isSecureEnv(): boolean {
  return process.env.NODE_ENV === 'production'
}

function setRefreshCookie(res: any, token: string) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: isSecureEnv(),
    sameSite: 'strict' as const,
    maxAge: COOKIE_MAX_AGE,
    path: '/api/auth',
  })
}

function clearRefreshCookie(res: any) {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: isSecureEnv(),
    sameSite: 'strict' as const,
    path: '/api/auth',
  })
}

router.post('/login', validateBody(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body

    const user = await getUserByEmail(email)
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' })
      return
    }

    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' })
      return
    }

    const accessToken = generateAccessToken(user)
    const refreshToken = await generateRefreshToken(user.id)

    setRefreshCookie(res, refreshToken)
    res.json({
      accessToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    })
  } catch (err) {
    log.error({ err }, 'login failed')
    res.status(500).json({ error: 'Login failed' })
  }
})

router.post('/refresh', async (req, res) => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE]
    if (!token) {
      res.status(401).json({ error: 'No refresh token' })
      return
    }

    const result = await rotateRefreshToken(token)
    setRefreshCookie(res, result.refreshToken)
    res.json({ accessToken: result.accessToken })
  } catch (err) {
    clearRefreshCookie(res)
    if (err instanceof Error && (err.message === 'Invalid refresh token' || err.message === 'Refresh token expired')) {
      res.status(401).json({ error: err.message })
      return
    }
    log.error({ err }, 'token refresh failed')
    res.status(500).json({ error: 'Token refresh failed' })
  }
})

router.post('/logout', async (req, res) => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE]
    if (token) {
      await revokeRefreshToken(token)
    }
    clearRefreshCookie(res)
    res.json({ message: 'Logged out' })
  } catch (err) {
    log.error({ err }, 'logout failed')
    clearRefreshCookie(res)
    res.json({ message: 'Logged out' })
  }
})

router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing authorization header' })
      return
    }

    const token = authHeader.slice(7)
    const payload = verifyAccessToken(token)
    const user = await getUserById(payload.userId)
    if (!user) {
      res.status(401).json({ error: 'User not found' })
      return
    }

    res.json(user)
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' })
  }
})

export default router
