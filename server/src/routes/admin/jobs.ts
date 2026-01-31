import { Router } from 'express'
import { createLogger } from '../../lib/logger.js'
import cron from 'node-cron'
import prisma from '../../lib/prisma.js'
import { runJob, runningJobs } from '../../jobs/scheduler.js'
import { validateBody } from '../../middleware/validate.js'
import { updateJobSchema } from '../../schemas/job.js'
import { runCrawlFeeds } from '../../jobs/crawlFeeds.js'
import { runPreassessStories } from '../../jobs/preassessStories.js'
import { runAssessStories } from '../../jobs/assessStories.js'
import { runSelectStories } from '../../jobs/selectStories.js'
import { runPublishStories } from '../../jobs/publishStories.js'

const JOB_HANDLERS: Record<string, () => Promise<void>> = {
  crawl_feeds: runCrawlFeeds,
  preassess_stories: runPreassessStories,
  assess_stories: runAssessStories,
  select_stories: runSelectStories,
  publish_stories: runPublishStories,
}

const router = Router()
const log = createLogger('jobs')

router.get('/', async (_req, res) => {
  try {
    const jobs = await prisma.jobRun.findMany({ orderBy: { jobName: 'asc' } })
    res.json(jobs.map(job => ({ ...job, running: runningJobs.has(job.jobName) })))
  } catch (err) {
    log.error({ err }, 'failed to fetch jobs')
    res.status(500).json({ error: 'Failed to fetch jobs' })
  }
})

router.put('/:jobName', validateBody(updateJobSchema), async (req, res) => {
  try {
    if (req.body.cronExpression && !cron.validate(req.body.cronExpression)) {
      res.status(400).json({ error: 'Invalid cron expression' })
      return
    }

    const job = await prisma.jobRun.update({
      where: { jobName: req.params.jobName },
      data: req.body,
    })
    res.json(job)
  } catch (err: any) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Job not found' })
      return
    }
    log.error({ err }, 'failed to update job')
    res.status(500).json({ error: 'Failed to update job' })
  }
})

router.post('/:jobName/run', async (req, res) => {
  const handler = JOB_HANDLERS[req.params.jobName]
  if (!handler) {
    res.status(404).json({ error: 'Job not found' })
    return
  }

  // Run in background — don't block the response
  runJob(req.params.jobName, handler).catch(err => {
    log.error({ err, jobName: req.params.jobName }, 'manual job run failed')
  })

  res.json({ message: `Job ${req.params.jobName} triggered` })
})

export default router
