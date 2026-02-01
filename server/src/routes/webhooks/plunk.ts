import { Router } from 'express'
import { config } from '../../config.js'
import prisma from '../../lib/prisma.js'
import { createLogger } from '../../lib/logger.js'

const router = Router()
const log = createLogger('webhook:plunk')

router.post('/', async (req, res) => {
  // Verify webhook secret
  const secret = req.query.secret as string
  if (!config.plunk.webhookSecret || secret !== config.plunk.webhookSecret) {
    log.warn('webhook received with invalid secret')
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const { event, contact, campaign } = req.body || {}

    await (prisma as any).emailEvent.create({
      data: {
        eventType: event || 'unknown',
        contactEmail: contact?.email || null,
        contactId: contact?.id || null,
        campaignId: campaign?.id || null,
        payload: req.body || {},
      },
    })

    log.info({ eventType: event, contactEmail: contact?.email }, 'webhook event recorded')
    res.json({ received: true })
  } catch (err) {
    log.error({ err }, 'failed to process webhook')
    res.status(500).json({ error: 'Failed to process webhook' })
  }
})

export default router
