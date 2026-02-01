import { randomUUID } from 'crypto'
import prisma from '../lib/prisma.js'
import { config } from '../config.js'
import * as plunk from './plunk.js'
import { createLogger } from '../lib/logger.js'

const log = createLogger('subscribe')

const CLIENT_URL = process.env.CLIENT_URL || 'https://actuallyrelevant.news'
const API_URL = process.env.API_URL || 'https://api.actuallyrelevant.news'

export async function subscribe(email: string) {
  const token = randomUUID()
  const expiresAt = new Date(Date.now() + config.subscribe.confirmTokenExpiryHours * 60 * 60 * 1000)

  // Check if already confirmed
  const existing = await (prisma as any).pendingSubscription.findFirst({
    where: { email, confirmedAt: { not: null } },
  })
  if (existing) {
    log.info({ email }, 'already subscribed, returning success without action')
    return
  }

  // Create contact in Plunk (subscribed: false until confirmed)
  let plunkContactId: string | null = null
  try {
    const contact = await plunk.createContact({
      email,
      subscribed: false,
      data: { pendingConfirmation: true },
    })
    plunkContactId = contact.id
  } catch (err) {
    log.warn({ err, email }, 'failed to create Plunk contact, proceeding with subscription')
  }

  // Store pending subscription
  await (prisma as any).pendingSubscription.create({
    data: {
      email,
      token,
      plunkContactId,
      expiresAt,
    },
  })

  // Send confirmation email
  const confirmUrl = `${API_URL}/api/subscribe/confirm?token=${token}&email=${encodeURIComponent(email)}`

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="500" cellpadding="0" cellspacing="0" style="max-width:500px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="padding:32px 32px 24px;text-align:center;border-bottom:3px solid #2563eb;">
              <h1 style="margin:0;font-size:22px;font-weight:800;color:#171717;">Actually Relevant</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 16px;font-size:20px;color:#171717;">Confirm your subscription</h2>
              <p style="margin:0 0 24px;font-size:15px;color:#525252;line-height:1.6;">Click the button below to confirm your subscription to Actually Relevant. You'll receive our newsletter with AI-curated news that matters.</p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="border-radius:6px;background-color:#2563eb;">
                    <a href="${confirmUrl}" style="display:inline-block;padding:14px 32px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;">Confirm Subscription</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-size:13px;color:#a3a3a3;">This link expires in ${config.subscribe.confirmTokenExpiryHours} hours. If you didn't request this, you can safely ignore this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  try {
    await plunk.sendTransactional({
      to: email,
      subject: 'Confirm your subscription to Actually Relevant',
      body: html,
    })
    log.info({ email }, 'confirmation email sent')
  } catch (err) {
    log.error({ err, email }, 'failed to send confirmation email')
    throw new Error('Failed to send confirmation email')
  }
}

export async function confirmSubscription(token: string, email: string) {
  const pending = await (prisma as any).pendingSubscription.findFirst({
    where: { token, email },
  })

  if (!pending) {
    throw new Error('Invalid confirmation link')
  }

  if (pending.confirmedAt) {
    return // Already confirmed
  }

  if (new Date() > pending.expiresAt) {
    throw new Error('Confirmation link has expired')
  }

  // Update Plunk contact to subscribed
  if (pending.plunkContactId) {
    try {
      await plunk.updateContact(pending.plunkContactId, {
        subscribed: true,
        data: { pendingConfirmation: false },
      })
    } catch (err) {
      log.warn({ err, email }, 'failed to update Plunk contact, marking as confirmed anyway')
    }
  }

  // Mark as confirmed
  await (prisma as any).pendingSubscription.update({
    where: { id: pending.id },
    data: { confirmedAt: new Date() },
  })

  log.info({ email }, 'subscription confirmed')
}
