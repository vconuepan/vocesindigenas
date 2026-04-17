import { createLogger } from '../lib/logger.js'
import { isInstagramConfigured } from '../lib/instagram.js'
import { updateMetrics } from '../services/instagram.js'

const log = createLogger('instagram_update_metrics')

export async function runInstagramUpdateMetrics(): Promise<void> {
  log.info('starting Instagram metrics update job')

  if (!isInstagramConfigured()) {
    log.warn('Instagram credentials not configured, skipping metrics update')
    return
  }

  try {
    await updateMetrics()
    log.info('Instagram metrics update complete')
  } catch (err) {
    log.error({ err }, 'Instagram metrics update failed')
    throw err
  }
}
