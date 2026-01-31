import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { TEST_API_KEY } from './test/helpers.js'

vi.mock('express-rate-limit', () => ({
  default: () => (_req: any, _res: any, next: any) => next(),
}))

// Mock prisma to avoid DB connections
const mockPrisma = vi.hoisted(() => ({
  story: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    groupBy: vi.fn(),
  },
  issue: { findMany: vi.fn(), findUnique: vi.fn() },
  feed: { findMany: vi.fn(), findUnique: vi.fn() },
  newsletter: { findMany: vi.fn(), findUnique: vi.fn() },
  podcast: { findMany: vi.fn(), findUnique: vi.fn() },
  user: { findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn() },
  jobRun: { findMany: vi.fn(), findUnique: vi.fn() },
  refreshToken: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
  $disconnect: vi.fn(),
  $transaction: vi.fn((args: any) => Array.isArray(args) ? Promise.all(args) : args()),
}))

vi.mock('./lib/prisma.js', () => ({ default: mockPrisma }))
vi.mock('./services/crawler.js', () => ({
  crawlFeed: vi.fn(),
  crawlAllDueFeeds: vi.fn(),
  crawlUrl: vi.fn(),
}))
vi.mock('./services/analysis.js', () => ({
  preAssessStories: vi.fn(),
  assessStory: vi.fn(),
  selectStories: vi.fn(),
  bulkPreAssess: vi.fn(),
  bulkAssess: vi.fn(),
  bulkSelect: vi.fn(),
}))

process.env.PUBLIC_API_KEY = TEST_API_KEY

const { default: app } = await import('./app.js')

describe('App error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('404 handler', () => {
    it('returns 404 JSON for unmatched GET route', async () => {
      const res = await request(app).get('/api/nonexistent-route')

      expect(res.status).toBe(404)
      expect(res.body).toEqual({ error: 'Not found' })
    })

    it('returns 404 JSON for unmatched POST route', async () => {
      const res = await request(app).post('/api/nonexistent-route')

      expect(res.status).toBe(404)
      expect(res.body).toEqual({ error: 'Not found' })
    })

    it('returns 404 for routes outside /api prefix', async () => {
      const res = await request(app).get('/completely-unknown-path')

      expect(res.status).toBe(404)
      expect(res.body).toEqual({ error: 'Not found' })
    })
  })

  describe('500 error handler', () => {
    it('returns 500 JSON when CORS rejects an origin', async () => {
      // The CORS middleware throws "Not allowed by CORS" for disallowed origins,
      // which is caught by the global error handler since it is not inside a try/catch.
      const res = await request(app)
        .get('/api/stories')
        .set('Origin', 'https://evil-site.com')

      expect(res.status).toBe(500)
      expect(res.body).toEqual({ error: 'Internal server error' })
    })
  })
})
