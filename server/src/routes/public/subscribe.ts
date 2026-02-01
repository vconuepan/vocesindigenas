import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { config } from '../../config.js'
import { validateBody } from '../../middleware/validate.js'
import * as subscribeService from '../../services/subscribe.js'
import { createLogger } from '../../lib/logger.js'

const router = Router()
const log = createLogger('public:subscribe')

const subscribeLimiter = rateLimit({
  windowMs: config.subscribe.rateLimitWindowMs,
  max: config.subscribe.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many subscription attempts. Please try again later.' },
})

const subscribeSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
})

router.post('/', subscribeLimiter, validateBody(subscribeSchema), async (req, res) => {
  try {
    await subscribeService.subscribe(req.body.email)
    // Always return success to avoid information leaks
    res.json({ success: true, message: 'Check your email to confirm your subscription.' })
  } catch (err) {
    log.error({ err }, 'subscribe error')
    // Still return success to avoid leaking whether an email exists
    res.json({ success: true, message: 'Check your email to confirm your subscription.' })
  }
})

router.get('/confirm', async (req, res) => {
  const { token, email } = req.query as { token?: string; email?: string }
  const clientUrl = process.env.CLIENT_URL || 'https://actuallyrelevant.news'

  if (!token || !email) {
    res.redirect(`${clientUrl}/subscribed?error=invalid`)
    return
  }

  try {
    await subscribeService.confirmSubscription(token, email)
    res.redirect(`${clientUrl}/subscribed`)
  } catch (err: any) {
    log.warn({ err, email }, 'confirmation failed')
    if (err.message === 'Confirmation link has expired') {
      res.redirect(`${clientUrl}/subscribed?error=expired`)
    } else {
      res.redirect(`${clientUrl}/subscribed?error=invalid`)
    }
  }
})

export default router
