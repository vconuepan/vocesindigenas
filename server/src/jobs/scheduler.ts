import cron from 'node-cron'
import prisma from '../lib/prisma.js'
import { createLogger } from '../lib/logger.js'
import { runCrawlFeeds } from './crawlFeeds.js'
import { runPreassessStories } from './preassessStories.js'
import { runAssessStories } from './assessStories.js'
import { runSelectStories } from './selectStories.js'
import { runPublishStories } from './publishStories.js'

const log = createLogger('scheduler')

const JOB_HANDLERS: Record<string, () => Promise<void>> = {
  crawl_feeds: runCrawlFeeds,
  preassess_stories: runPreassessStories,
  assess_stories: runAssessStories,
  select_stories: runSelectStories,
  publish_stories: runPublishStories,
}

const registeredTasks: cron.ScheduledTask[] = []
const runningJobs = new Set<string>()

export async function initScheduler(): Promise<void> {
  log.info('initializing')

  const jobs = await prisma.jobRun.findMany()

  for (const job of jobs) {
    if (!job.enabled) {
      log.info({ jobName: job.jobName }, 'disabled, skipping')
      continue
    }

    const handler = JOB_HANDLERS[job.jobName]
    if (!handler) {
      log.warn({ jobName: job.jobName }, 'no handler found, skipping')
      continue
    }

    if (!cron.validate(job.cronExpression)) {
      log.error({ jobName: job.jobName, cronExpression: job.cronExpression }, 'invalid cron expression, skipping')
      continue
    }

    // Register cron job
    const task = cron.schedule(job.cronExpression, () => {
      runJob(job.jobName, handler)
    })
    registeredTasks.push(task)
    log.info({ jobName: job.jobName, cronExpression: job.cronExpression }, 'registered')

    // Check if overdue
    if (isOverdue(job)) {
      log.info({ jobName: job.jobName }, 'overdue, running now')
      runJob(job.jobName, handler)
    }
  }

  log.info({ jobCount: registeredTasks.length }, 'ready')
}

function isOverdue(job: { jobName: string; lastCompletedAt: Date | null; cronExpression: string }): boolean {
  if (!job.lastCompletedAt) return true

  // Simple heuristic: parse the cron to estimate interval
  // For expressions like "0 */6 * * *", the interval is ~6 hours
  // We consider a job overdue if it hasn't run in 2x the expected interval
  const intervalMs = estimateCronIntervalMs(job.cronExpression)
  if (!intervalMs) return false

  const elapsed = Date.now() - job.lastCompletedAt.getTime()
  return elapsed > intervalMs * 2
}

function estimateCronIntervalMs(cronExpr: string): number | null {
  const parts = cronExpr.split(' ')
  if (parts.length < 5) return null

  const [, hourPart] = parts

  // "*/N" pattern → every N hours
  const everyMatch = hourPart.match(/^\*\/(\d+)$/)
  if (everyMatch) return parseInt(everyMatch[1]) * 60 * 60 * 1000

  // "H1,H2,H3" pattern → interval between entries
  const hours = hourPart.split(',').map(Number).filter(n => !isNaN(n))
  if (hours.length >= 2) {
    const avgGap = 24 / hours.length
    return avgGap * 60 * 60 * 1000
  }

  // Single hour → daily
  if (/^\d+$/.test(hourPart)) return 24 * 60 * 60 * 1000

  return null
}

async function runJob(jobName: string, handler: () => Promise<void>): Promise<void> {
  if (runningJobs.has(jobName)) {
    log.warn({ jobName }, 'already running, skipping')
    return
  }

  runningJobs.add(jobName)
  log.info({ jobName }, 'started')

  await prisma.jobRun.update({
    where: { jobName },
    data: { lastStartedAt: new Date(), lastError: null },
  })

  try {
    await handler()
    await prisma.jobRun.update({
      where: { jobName },
      data: { lastCompletedAt: new Date() },
    })
    log.info({ jobName }, 'completed')
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    log.error({ jobName, err }, 'job failed')
    await prisma.jobRun.update({
      where: { jobName },
      data: { lastError: errorMsg, lastCompletedAt: new Date() },
    })
  } finally {
    runningJobs.delete(jobName)
  }
}

// Exported for manual trigger via admin API
export { runJob, runningJobs }

export function stopScheduler(): void {
  for (const task of registeredTasks) {
    task.stop()
  }
  registeredTasks.length = 0
}
