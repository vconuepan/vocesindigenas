import { ZodSchema } from 'zod'
import type { Request, Response, NextFunction } from 'express'

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      const details = process.env.NODE_ENV !== 'production' ? result.error.flatten() : undefined
      res.status(400).json({ error: 'Validation failed', ...(details && { details }) })
      return
    }
    req.body = result.data
    next()
  }
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query)
    if (!result.success) {
      const details = process.env.NODE_ENV !== 'production' ? result.error.flatten() : undefined
      res.status(400).json({ error: 'Invalid query parameters', ...(details && { details }) })
      return
    }
    req.parsedQuery = result.data
    next()
  }
}
