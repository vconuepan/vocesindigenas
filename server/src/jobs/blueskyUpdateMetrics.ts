import { createLogger } from '../lib/logger.js'
import { isBlueskyConfigured } from '../lib/bluesky.js'
import { updateMetrics } from '../services/bluesky.js'

const log = createLogger('bluesky_update_metrics')

export async function runBlueskyUpdateMetrics(): Promise<void> {
  log.info('starting Bluesky metrics update job')

  if (!isBlueskyConfigured()) {
    log.warn('Bluesky credentials not configured, skipping metrics update')
    return
  }

  try {
    await updateMetrics()
    log.info('Bluesky metrics update complete')
  } catch (err) {
    log.error({ err }, 'Bluesky metrics update failed')
    throw err
  }
}
