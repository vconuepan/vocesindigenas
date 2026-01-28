import type { Request, Response, NextFunction } from 'express'

/**
 * Admin authentication middleware.
 * For v1, checks a static API key from environment.
 * Will be expanded to JWT/session-based auth when user accounts are added.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  const apiKey = process.env.ADMIN_API_KEY

  if (!apiKey) {
    res.status(500).json({ error: 'Server misconfiguration: ADMIN_API_KEY not set' })
    return
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization header' })
    return
  }

  const token = authHeader.slice(7)
  if (token !== apiKey) {
    res.status(403).json({ error: 'Invalid credentials' })
    return
  }

  next()
}
