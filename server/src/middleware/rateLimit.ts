import rateLimit from 'express-rate-limit'

/**
 * General API rate limiter.
 * Applied to public endpoints to prevent abuse.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests. Please try again later.'
  }
})

/**
 * Operational rate limiter for LLM-triggering endpoints.
 * Not a security measure — admins are trusted. This prevents runaway
 * costs by capping the number of LLM operations per hour.
 * Each endpoint tracks its own budget via keyGenerator.
 */
export const expensiveOpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}-${req.baseUrl}${req.path}`,
  message: {
    error: 'Operational limit reached for this endpoint. Please try again later.'
  }
})
