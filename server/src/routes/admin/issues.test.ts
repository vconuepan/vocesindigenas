import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { authHeader, sampleIssue, TEST_API_KEY } from '../../test/helpers.js'

const mockPrisma = vi.hoisted(() => ({
  issue: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  feed: {
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

process.env.ADMIN_API_KEY = TEST_API_KEY

const { default: app } = await import('../../app.js')

describe('Admin Issues API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/admin/issues', () => {
    it('returns 401 without auth header', async () => {
      const res = await request(app).get('/api/admin/issues')
      expect(res.status).toBe(401)
    })

    it('returns 403 with invalid auth', async () => {
      const res = await request(app)
        .get('/api/admin/issues')
        .set('Authorization', 'Bearer wrong-key')
      expect(res.status).toBe(403)
    })

    it('returns all issues', async () => {
      const issues = [sampleIssue(), sampleIssue({ id: 'issue-2', name: 'Climate', slug: 'climate' })]
      mockPrisma.issue.findMany.mockResolvedValue(issues)

      const res = await request(app)
        .get('/api/admin/issues')
        .set(authHeader())
      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(2)
      expect(res.body[0].name).toBe('AI & Technology')
    })
  })

  describe('GET /api/admin/issues/:id', () => {
    it('returns a single issue', async () => {
      mockPrisma.issue.findUnique.mockResolvedValue(sampleIssue())

      const res = await request(app)
        .get('/api/admin/issues/issue-1')
        .set(authHeader())
      expect(res.status).toBe(200)
      expect(res.body.name).toBe('AI & Technology')
    })

    it('returns 404 for unknown issue', async () => {
      mockPrisma.issue.findUnique.mockResolvedValue(null)

      const res = await request(app)
        .get('/api/admin/issues/unknown')
        .set(authHeader())
      expect(res.status).toBe(404)
    })
  })

  describe('POST /api/admin/issues', () => {
    it('creates a new issue', async () => {
      mockPrisma.issue.create.mockResolvedValue(sampleIssue())

      const res = await request(app)
        .post('/api/admin/issues')
        .set(authHeader())
        .send({ name: 'AI & Technology', slug: 'ai-technology' })
      expect(res.status).toBe(201)
      expect(res.body.name).toBe('AI & Technology')
    })

    it('returns 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/api/admin/issues')
        .set(authHeader())
        .send({})
      expect(res.status).toBe(400)
    })

    it('returns 400 for invalid slug format', async () => {
      const res = await request(app)
        .post('/api/admin/issues')
        .set(authHeader())
        .send({ name: 'Test', slug: 'Invalid Slug!' })
      expect(res.status).toBe(400)
    })

    it('returns 409 for duplicate slug', async () => {
      mockPrisma.issue.create.mockRejectedValue({ code: 'P2002' })

      const res = await request(app)
        .post('/api/admin/issues')
        .set(authHeader())
        .send({ name: 'Test', slug: 'existing-slug' })
      expect(res.status).toBe(409)
    })
  })

  describe('PUT /api/admin/issues/:id', () => {
    it('updates an issue', async () => {
      const updated = sampleIssue({ name: 'Updated Name' })
      mockPrisma.issue.update.mockResolvedValue(updated)

      const res = await request(app)
        .put('/api/admin/issues/issue-1')
        .set(authHeader())
        .send({ name: 'Updated Name' })
      expect(res.status).toBe(200)
      expect(res.body.name).toBe('Updated Name')
    })

    it('returns 404 for unknown issue', async () => {
      mockPrisma.issue.update.mockRejectedValue({ code: 'P2025' })

      const res = await request(app)
        .put('/api/admin/issues/unknown')
        .set(authHeader())
        .send({ name: 'Test' })
      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /api/admin/issues/:id', () => {
    it('deletes an issue', async () => {
      mockPrisma.feed.count.mockResolvedValue(0)
      mockPrisma.issue.delete.mockResolvedValue(sampleIssue())

      const res = await request(app)
        .delete('/api/admin/issues/issue-1')
        .set(authHeader())
      expect(res.status).toBe(204)
    })

    it('returns 409 when issue has feeds', async () => {
      mockPrisma.feed.count.mockResolvedValue(3)

      const res = await request(app)
        .delete('/api/admin/issues/issue-1')
        .set(authHeader())
      expect(res.status).toBe(409)
    })
  })
})
