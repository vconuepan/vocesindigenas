import { Router } from 'express'
import cron from 'node-cron'
import prisma from '../../lib/prisma.js'
import { runJob } from '../../jobs/scheduler.js'
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

router.get('/', async (_req, res) => {
  try {
    const jobs = await prisma.jobRun.findMany({ orderBy: { jobName: 'asc' } })
    res.json(jobs)
  } catch (err) {
    console.error('[jobs] Failed to fetch jobs:', err)
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
    console.error('[jobs] Failed to update job:', err)
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
    console.error(`[jobs] Manual run of ${req.params.jobName} failed:`, err)
  })

  res.json({ message: `Job ${req.params.jobName} triggered` })
})

export default router
