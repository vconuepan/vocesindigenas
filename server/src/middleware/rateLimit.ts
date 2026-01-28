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
 * Stricter rate limiter for expensive operations (e.g. LLM calls).
 */
export const expensiveOpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Rate limit exceeded for this operation. Please try again in a bit.'
  }
})
