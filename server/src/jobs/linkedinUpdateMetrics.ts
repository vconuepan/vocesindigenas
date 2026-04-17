import { createLogger } from '../lib/logger.js'
import { isLinkedInConfigured } from '../lib/linkedin.js'
import { updateMetrics } from '../services/linkedin.js'

const log = createLogger('linkedin_update_metrics')

export async function runLinkedInUpdateMetrics(): Promise<void> {
  log.info('starting LinkedIn metrics update job')

  if (!isLinkedInConfigured()) {
    log.warn('LinkedIn credentials not configured, skipping metrics update')
    return
  }

  try {
    await updateMetrics()
    log.info('LinkedIn metrics update complete')
  } catch (err) {
    log.error({ err }, 'LinkedIn metrics update failed')
    throw err
  }
}
