import cron from 'node-cron'
import prisma from '../lib/prisma.js'
import { runCrawlFeeds } from './crawlFeeds.js'
import { runPreassessStories } from './preassessStories.js'
import { runAssessStories } from './assessStories.js'
import { runSelectStories } from './selectStories.js'

const JOB_HANDLERS: Record<string, () => Promise<void>> = {
  crawl_feeds: runCrawlFeeds,
  preassess_stories: runPreassessStories,
  assess_stories: runAssessStories,
  select_stories: runSelectStories,
}

const registeredTasks: cron.ScheduledTask[] = []

export async function initScheduler(): Promise<void> {
  console.log('[Scheduler] Initializing...')

  const jobs = await prisma.jobRun.findMany()

  for (const job of jobs) {
    if (!job.enabled) {
      console.log(`[Scheduler] ${job.jobName}: disabled, skipping`)
      continue
    }

    const handler = JOB_HANDLERS[job.jobName]
    if (!handler) {
      console.warn(`[Scheduler] ${job.jobName}: no handler found, skipping`)
      continue
    }

    if (!cron.validate(job.cronExpression)) {
      console.error(`[Scheduler] ${job.jobName}: invalid cron "${job.cronExpression}", skipping`)
      continue
    }

    // Register cron job
    const task = cron.schedule(job.cronExpression, () => {
      runJob(job.jobName, handler)
    })
    registeredTasks.push(task)
    console.log(`[Scheduler] ${job.jobName}: registered (${job.cronExpression})`)

    // Check if overdue
    if (isOverdue(job)) {
      console.log(`[Scheduler] ${job.jobName}: overdue, running now`)
      runJob(job.jobName, handler)
    }
  }

  console.log(`[Scheduler] Ready (${registeredTasks.length} jobs registered)`)
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
  // Overlap prevention
  const job = await prisma.jobRun.findUnique({ where: { jobName } })
  if (!job) return

  if (job.lastStartedAt && (!job.lastCompletedAt || job.lastStartedAt > job.lastCompletedAt)) {
    console.warn(`[Scheduler] ${jobName}: already running, skipping`)
    return
  }

  // Mark as started
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
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error(`[Scheduler] ${jobName} failed:`, errorMsg)
    await prisma.jobRun.update({
      where: { jobName },
      data: { lastError: errorMsg, lastCompletedAt: new Date() },
    })
  }
}

// Exported for manual trigger via admin API
export { runJob }

export function stopScheduler(): void {
  for (const task of registeredTasks) {
    task.stop()
  }
  registeredTasks.length = 0
}
