import { createLogger } from '../lib/logger.js'
import { isMastodonConfigured } from '../lib/mastodon.js'
import { updateMetrics } from '../services/mastodon.js'

const log = createLogger('mastodon_update_metrics')

export async function runMastodonUpdateMetrics(): Promise<void> {
  log.info('starting Mastodon metrics update job')

  if (!isMastodonConfigured()) {
    log.warn('Mastodon credentials not configured, skipping metrics update')
    return
  }

  try {
    await updateMetrics()
    log.info('Mastodon metrics update complete')
  } catch (err) {
    log.error({ err }, 'Mastodon metrics update failed')
    throw err
  }
}
