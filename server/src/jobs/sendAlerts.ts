import { createLogger } from '../lib/logger.js'
import { sendDailyAlerts } from '../services/alerts.js'

const log = createLogger('job:send_alerts')

export async function runSendAlerts(): Promise<void> {
  log.info('starting')
  await sendDailyAlerts()
  log.info('complete')
}
