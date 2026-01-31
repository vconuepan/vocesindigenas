import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { authHeader, TEST_API_KEY } from '../../test/helpers.js'

vi.mock('express-rate-limit', () => ({
  default: () => (_req: any, _res: any, next: any) => next(),
}))

const mockPrisma = vi.hoisted(() => ({
  jobRun: {
    findMany: vi.fn(),
    update: vi.fn(),
  },
  $disconnect: vi.fn(),
}))

const mockRunJob = vi.hoisted(() => vi.fn())
const mockRunCrawlFeeds = vi.hoisted(() => vi.fn())
const mockRunPreassessStories = vi.hoisted(() => vi.fn())
const mockRunAssessStories = vi.hoisted(() => vi.fn())
const mockRunSelectStories = vi.hoisted(() => vi.fn())

vi.mock('../../lib/prisma.js', () => ({ default: mockPrisma }))
vi.mock('../../services/crawler.js', () => ({
  crawlFeed: vi.fn(),
  crawlAllDueFeeds: vi.fn(),
  crawlUrl: vi.fn(),
}))
const mockReloadJob = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
vi.mock('../../jobs/scheduler.js', () => ({ runJob: mockRunJob, reloadJob: mockReloadJob, runningJobs: new Set() }))
vi.mock('../../jobs/crawlFeeds.js', () => ({ runCrawlFeeds: mockRunCrawlFeeds }))
vi.mock('../../jobs/preassessStories.js', () => ({ runPreassessStories: mockRunPreassessStories }))
vi.mock('../../jobs/assessStories.js', () => ({ runAssessStories: mockRunAssessStories }))
vi.mock('../../jobs/selectStories.js', () => ({ runSelectStories: mockRunSelectStories }))

process.env.PUBLIC_API_KEY = TEST_API_KEY

const { default: app } = await import('../../app.js')

describe('Admin Jobs API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/admin/jobs', () => {
    it('returns all jobs', async () => {
      const jobs = [
        { jobName: 'crawl_feeds', enabled: true, cronExpression: '0 */6 * * *' },
        { jobName: 'assess_stories', enabled: false, cronExpression: '0 8 * * *' },
      ]
      mockPrisma.jobRun.findMany.mockResolvedValue(jobs)

      const res = await request(app)
        .get('/api/admin/jobs')
        .set(authHeader())

      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(2)
      expect(res.body[0].jobName).toBe('crawl_feeds')
    })

    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/admin/jobs')
      expect(res.status).toBe(401)
    })
  })

  describe('PUT /api/admin/jobs/:jobName', () => {
    it('updates job settings', async () => {
      const updatedJob = { jobName: 'crawl_feeds', enabled: false, cronExpression: '0 */6 * * *' }
      mockPrisma.jobRun.update.mockResolvedValue(updatedJob)

      const res = await request(app)
        .put('/api/admin/jobs/crawl_feeds')
        .set(authHeader())
        .send({ enabled: false })

      expect(res.status).toBe(200)
      expect(res.body.enabled).toBe(false)
    })

    it('validates cron expression', async () => {
      const res = await request(app)
        .put('/api/admin/jobs/crawl_feeds')
        .set(authHeader())
        .send({ cronExpression: 'not-a-cron' })

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Invalid cron expression')
    })

    it('returns 404 for unknown job', async () => {
      mockPrisma.jobRun.update.mockRejectedValue({ code: 'P2025' })

      const res = await request(app)
        .put('/api/admin/jobs/nonexistent')
        .set(authHeader())
        .send({ enabled: true })

      expect(res.status).toBe(404)
    })
  })

  describe('POST /api/admin/jobs/:jobName/run', () => {
    it('triggers a known job', async () => {
      mockRunJob.mockResolvedValue(undefined)

      const res = await request(app)
        .post('/api/admin/jobs/crawl_feeds/run')
        .set(authHeader())

      expect(res.status).toBe(200)
      expect(res.body.message).toContain('crawl_feeds')
      expect(mockRunJob).toHaveBeenCalledWith('crawl_feeds', mockRunCrawlFeeds)
    })

    it('returns 404 for unknown job', async () => {
      const res = await request(app)
        .post('/api/admin/jobs/nonexistent/run')
        .set(authHeader())

      expect(res.status).toBe(404)
    })
  })
})
