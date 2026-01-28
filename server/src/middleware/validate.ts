import { ZodSchema } from 'zod'
import type { Request, Response, NextFunction } from 'express'

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      res.status(400).json({ error: 'Validation failed', details: result.error.flatten() })
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
      res.status(400).json({ error: 'Invalid query parameters', details: result.error.flatten() })
      return
    }
    ;(req as any).parsedQuery = result.data
    next()
  }
}
