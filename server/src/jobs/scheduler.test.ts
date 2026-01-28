import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSchedule = vi.hoisted(() => vi.fn(() => ({ stop: vi.fn() })))
const mockValidate = vi.hoisted(() => vi.fn(() => true))

const mockPrisma = vi.hoisted(() => ({
  jobRun: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  $disconnect: vi.fn(),
}))

vi.mock('node-cron', () => ({
  default: {
    schedule: mockSchedule,
    validate: mockValidate,
  },
}))

vi.mock('../lib/prisma.js', () => ({ default: mockPrisma }))
vi.mock('./crawlFeeds.js', () => ({ runCrawlFeeds: vi.fn() }))
vi.mock('./preassessStories.js', () => ({ runPreassessStories: vi.fn() }))
vi.mock('./assessStories.js', () => ({ runAssessStories: vi.fn() }))
vi.mock('./selectStories.js', () => ({ runSelectStories: vi.fn() }))

const { initScheduler, stopScheduler } = await import('./scheduler.js')

describe('scheduler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockValidate.mockReturnValue(true)
    mockSchedule.mockReturnValue({ stop: vi.fn() })
    stopScheduler()
  })

  describe('initScheduler', () => {
    it('registers enabled jobs with valid cron expressions', async () => {
      mockPrisma.jobRun.findMany.mockResolvedValue([
        {
          jobName: 'crawl_feeds',
          enabled: true,
          cronExpression: '0 */6 * * *',
          lastCompletedAt: new Date(),
          lastStartedAt: null,
        },
      ])

      await initScheduler()

      expect(mockSchedule).toHaveBeenCalledTimes(1)
      expect(mockSchedule).toHaveBeenCalledWith('0 */6 * * *', expect.any(Function))
    })

    it('skips disabled jobs', async () => {
      mockPrisma.jobRun.findMany.mockResolvedValue([
        {
          jobName: 'crawl_feeds',
          enabled: false,
          cronExpression: '0 */6 * * *',
          lastCompletedAt: null,
          lastStartedAt: null,
        },
      ])

      await initScheduler()

      expect(mockSchedule).not.toHaveBeenCalled()
    })

    it('skips jobs with unknown handler', async () => {
      mockPrisma.jobRun.findMany.mockResolvedValue([
        {
          jobName: 'unknown_job',
          enabled: true,
          cronExpression: '0 */6 * * *',
          lastCompletedAt: null,
          lastStartedAt: null,
        },
      ])

      await initScheduler()

      expect(mockSchedule).not.toHaveBeenCalled()
    })

    it('skips jobs with invalid cron expression', async () => {
      mockValidate.mockReturnValue(false)
      mockPrisma.jobRun.findMany.mockResolvedValue([
        {
          jobName: 'crawl_feeds',
          enabled: true,
          cronExpression: 'bad cron',
          lastCompletedAt: null,
          lastStartedAt: null,
        },
      ])

      await initScheduler()

      expect(mockSchedule).not.toHaveBeenCalled()
    })

    it('triggers overdue jobs immediately', async () => {
      const oldDate = new Date(Date.now() - 48 * 60 * 60 * 1000) // 48 hours ago
      mockPrisma.jobRun.findMany.mockResolvedValue([
        {
          jobName: 'crawl_feeds',
          enabled: true,
          cronExpression: '0 */6 * * *',
          lastCompletedAt: oldDate,
          lastStartedAt: null,
        },
      ])
      // runJob will call findUnique
      mockPrisma.jobRun.findUnique.mockResolvedValue({
        jobName: 'crawl_feeds',
        lastStartedAt: null,
        lastCompletedAt: oldDate,
      })
      mockPrisma.jobRun.update.mockResolvedValue({})

      await initScheduler()

      // Should have scheduled AND triggered immediately
      expect(mockSchedule).toHaveBeenCalledTimes(1)
      // runJob should have been called (marks as started)
      expect(mockPrisma.jobRun.update).toHaveBeenCalled()
    })
  })

  describe('stopScheduler', () => {
    it('stops all registered tasks', async () => {
      const mockStop = vi.fn()
      mockSchedule.mockReturnValue({ stop: mockStop })
      mockPrisma.jobRun.findMany.mockResolvedValue([
        {
          jobName: 'crawl_feeds',
          enabled: true,
          cronExpression: '0 */6 * * *',
          lastCompletedAt: new Date(),
          lastStartedAt: null,
        },
      ])

      await initScheduler()
      stopScheduler()

      expect(mockStop).toHaveBeenCalled()
    })
  })
})
