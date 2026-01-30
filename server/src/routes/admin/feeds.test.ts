import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { authHeader, sampleFeed, sampleIssue, TEST_API_KEY } from '../../test/helpers.js'

vi.mock('express-rate-limit', () => ({
  default: () => (_req: any, _res: any, next: any) => next(),
}))

const mockPrisma = vi.hoisted(() => ({
  issue: {
    findUnique: vi.fn(),
  },
  feed: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  story: {
    count: vi.fn(),
  },
  $disconnect: vi.fn(),
}))

vi.mock('../../lib/prisma.js', () => ({ default: mockPrisma }))
vi.mock('../../services/crawler.js', () => ({
  crawlFeed: vi.fn(),
  crawlAllDueFeeds: vi.fn(),
  crawlUrl: vi.fn(),
}))

process.env.PUBLIC_API_KEY = TEST_API_KEY

const { default: app } = await import('../../app.js')

describe('Admin Feeds API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/admin/feeds', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/admin/feeds')
      expect(res.status).toBe(401)
    })

    it('returns all feeds', async () => {
      const feeds = [
        { ...sampleFeed(), issue: sampleIssue() },
        { ...sampleFeed({ id: 'feed-2', url: 'https://example.com/feed2' }), issue: sampleIssue() },
      ]
      mockPrisma.feed.findMany.mockResolvedValue(feeds)

      const res = await request(app)
        .get('/api/admin/feeds')
        .set(authHeader())
      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(2)
    })

    it('filters by issueId', async () => {
      mockPrisma.feed.findMany.mockResolvedValue([])

      const res = await request(app)
        .get('/api/admin/feeds?issueId=issue-1')
        .set(authHeader())
      expect(res.status).toBe(200)
      expect(mockPrisma.feed.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ issueId: 'issue-1' }),
        })
      )
    })

    it('filters by active status', async () => {
      mockPrisma.feed.findMany.mockResolvedValue([])

      const res = await request(app)
        .get('/api/admin/feeds?active=true')
        .set(authHeader())
      expect(res.status).toBe(200)
      expect(mockPrisma.feed.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ active: true }),
        })
      )
    })
  })

  describe('GET /api/admin/feeds/:id', () => {
    it('returns a single feed with issue', async () => {
      mockPrisma.feed.findUnique.mockResolvedValue({
        ...sampleFeed(),
        issue: sampleIssue(),
      })

      const res = await request(app)
        .get('/api/admin/feeds/feed-1')
        .set(authHeader())
      expect(res.status).toBe(200)
      expect(res.body.title).toBe('Test Feed')
      expect(res.body.issue).toBeDefined()
    })

    it('returns 404 for unknown feed', async () => {
      mockPrisma.feed.findUnique.mockResolvedValue(null)

      const res = await request(app)
        .get('/api/admin/feeds/unknown')
        .set(authHeader())
      expect(res.status).toBe(404)
    })
  })

  describe('POST /api/admin/feeds', () => {
    it('creates a feed', async () => {
      mockPrisma.issue.findUnique.mockResolvedValue(sampleIssue())
      mockPrisma.feed.create.mockResolvedValue(sampleFeed())

      const res = await request(app)
        .post('/api/admin/feeds')
        .set(authHeader())
        .send({
          title: 'Test Feed',
          url: 'https://example.com/feed',
          issueId: '00000000-0000-0000-0000-000000000001',
        })
      expect(res.status).toBe(201)
    })

    it('returns 400 for missing fields', async () => {
      const res = await request(app)
        .post('/api/admin/feeds')
        .set(authHeader())
        .send({})
      expect(res.status).toBe(400)
    })

    it('returns 400 for invalid URL', async () => {
      const res = await request(app)
        .post('/api/admin/feeds')
        .set(authHeader())
        .send({ title: 'Test', url: 'not-a-url', issueId: '00000000-0000-0000-0000-000000000001' })
      expect(res.status).toBe(400)
    })

    it('returns 400 when issue not found', async () => {
      mockPrisma.issue.findUnique.mockResolvedValue(null)

      const res = await request(app)
        .post('/api/admin/feeds')
        .set(authHeader())
        .send({
          title: 'Test Feed',
          url: 'https://example.com/feed',
          issueId: '00000000-0000-0000-0000-000000000000',
        })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Issue not found')
    })
  })

  describe('PUT /api/admin/feeds/:id', () => {
    it('updates a feed', async () => {
      mockPrisma.feed.update.mockResolvedValue(sampleFeed({ title: 'Updated' }))

      const res = await request(app)
        .put('/api/admin/feeds/feed-1')
        .set(authHeader())
        .send({ title: 'Updated' })
      expect(res.status).toBe(200)
    })

    it('returns 404 for unknown feed', async () => {
      mockPrisma.feed.update.mockRejectedValue({ code: 'P2025' })

      const res = await request(app)
        .put('/api/admin/feeds/unknown')
        .set(authHeader())
        .send({ title: 'Updated' })
      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /api/admin/feeds/:id', () => {
    it('deletes a feed with no stories', async () => {
      mockPrisma.story.count.mockResolvedValue(0)
      mockPrisma.feed.delete.mockResolvedValue(sampleFeed())

      const res = await request(app)
        .delete('/api/admin/feeds/feed-1')
        .set(authHeader())
      expect(res.status).toBe(200)
      expect(res.body.action).toBe('deleted')
      expect(res.body.message).toBe('Feed deleted')
    })

    it('deactivates a feed that has stories', async () => {
      mockPrisma.story.count.mockResolvedValue(5)
      mockPrisma.feed.update.mockResolvedValue(sampleFeed({ active: false }))

      const res = await request(app)
        .delete('/api/admin/feeds/feed-1')
        .set(authHeader())
      expect(res.status).toBe(200)
      expect(res.body.action).toBe('deactivated')
      expect(mockPrisma.feed.update).toHaveBeenCalledWith({
        where: { id: 'feed-1' },
        data: { active: false },
      })
    })
  })
})
