import axios from 'axios'
import { createLogger } from './logger.js'

const log = createLogger('notify')

export async function notifyJobFailure(jobName: string, error: string): Promise<void> {
  const url = process.env.WEBHOOK_URL
  if (!url) return

  try {
    await axios.post(url, {
      content: `Job **${jobName}** failed: ${error}`,
      text: `Job "${jobName}" failed: ${error}`,
      jobName,
      error,
      timestamp: new Date().toISOString(),
    }, { timeout: 5000, maxContentLength: 1 * 1024 * 1024 })
  } catch (err) {
    log.warn({ err, jobName }, 'failed to send webhook notification')
  }
}
