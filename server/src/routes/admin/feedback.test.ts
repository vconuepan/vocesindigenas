import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { authHeader, TEST_API_KEY } from '../../test/helpers.js'

vi.mock('express-rate-limit', () => ({
  default: () => (_req: any, _res: any, next: any) => next(),
}))

const mockPrisma = vi.hoisted(() => ({
  feedback: {
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
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

const sampleFeedback = {
  id: 'fb-1',
  category: 'general',
  message: 'Great site!',
  email: null,
  status: 'unread',
  ipHash: 'abc123',
  createdAt: new Date('2026-02-16'),
  updatedAt: new Date('2026-02-16'),
}

describe('Admin Feedback API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/admin/feedback', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/admin/feedback')
      expect(res.status).toBe(401)
    })

    it('returns paginated feedback list', async () => {
      mockPrisma.feedback.findMany.mockResolvedValue([sampleFeedback])
      mockPrisma.feedback.count
        .mockResolvedValueOnce(1) // total
        .mockResolvedValueOnce(1) // unreadCount

      const res = await request(app)
        .get('/api/admin/feedback')
        .set(authHeader())

      expect(res.status).toBe(200)
      expect(res.body.items).toHaveLength(1)
      expect(res.body.total).toBe(1)
      expect(res.body.unreadCount).toBe(1)
      expect(res.body.page).toBe(1)
    })

    it('filters by status', async () => {
      mockPrisma.feedback.findMany.mockResolvedValue([])
      mockPrisma.feedback.count.mockResolvedValue(0)

      await request(app)
        .get('/api/admin/feedback?status=archived')
        .set(authHeader())

      expect(mockPrisma.feedback.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'archived' }),
        })
      )
    })

    it('filters by category', async () => {
      mockPrisma.feedback.findMany.mockResolvedValue([])
      mockPrisma.feedback.count.mockResolvedValue(0)

      await request(app)
        .get('/api/admin/feedback?category=bug')
        .set(authHeader())

      expect(mockPrisma.feedback.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: 'bug' }),
        })
      )
    })
  })

  describe('GET /api/admin/feedback/count', () => {
    it('returns unread count', async () => {
      mockPrisma.feedback.count.mockResolvedValue(5)

      const res = await request(app)
        .get('/api/admin/feedback/count')
        .set(authHeader())

      expect(res.status).toBe(200)
      expect(res.body.unreadCount).toBe(5)
    })
  })

  describe('PATCH /api/admin/feedback/:id', () => {
    it('updates feedback status', async () => {
      mockPrisma.feedback.update.mockResolvedValue({ ...sampleFeedback, status: 'read' })

      const res = await request(app)
        .patch('/api/admin/feedback/fb-1')
        .set(authHeader())
        .send({ status: 'read' })

      expect(res.status).toBe(200)
      expect(res.body.status).toBe('read')
    })

    it('returns 400 for invalid status', async () => {
      const res = await request(app)
        .patch('/api/admin/feedback/fb-1')
        .set(authHeader())
        .send({ status: 'invalid' })

      expect(res.status).toBe(400)
    })

    it('returns 404 for non-existent feedback', async () => {
      mockPrisma.feedback.update.mockRejectedValue({ code: 'P2025' })

      const res = await request(app)
        .patch('/api/admin/feedback/nonexistent')
        .set(authHeader())
        .send({ status: 'read' })

      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /api/admin/feedback/:id', () => {
    it('deletes feedback', async () => {
      mockPrisma.feedback.delete.mockResolvedValue(sampleFeedback)

      const res = await request(app)
        .delete('/api/admin/feedback/fb-1')
        .set(authHeader())

      expect(res.status).toBe(204)
    })

    it('returns 404 for non-existent feedback', async () => {
      mockPrisma.feedback.delete.mockRejectedValue({ code: 'P2025' })

      const res = await request(app)
        .delete('/api/admin/feedback/nonexistent')
        .set(authHeader())

      expect(res.status).toBe(404)
    })
  })

  describe('POST /api/admin/feedback/bulk', () => {
    it('bulk marks as read', async () => {
      mockPrisma.feedback.updateMany.mockResolvedValue({ count: 2 })

      const res = await request(app)
        .post('/api/admin/feedback/bulk')
        .set(authHeader())
        .send({ ids: ['fb-1', 'fb-2'], action: 'read' })

      expect(res.status).toBe(200)
      expect(res.body.affected).toBe(2)
    })

    it('bulk deletes', async () => {
      mockPrisma.feedback.deleteMany.mockResolvedValue({ count: 2 })

      const res = await request(app)
        .post('/api/admin/feedback/bulk')
        .set(authHeader())
        .send({ ids: ['fb-1', 'fb-2'], action: 'delete' })

      expect(res.status).toBe(200)
      expect(res.body.affected).toBe(2)
    })

    it('returns 400 for empty ids', async () => {
      const res = await request(app)
        .post('/api/admin/feedback/bulk')
        .set(authHeader())
        .send({ ids: [], action: 'read' })

      expect(res.status).toBe(400)
    })

    it('returns 400 for invalid action', async () => {
      const res = await request(app)
        .post('/api/admin/feedback/bulk')
        .set(authHeader())
        .send({ ids: ['fb-1'], action: 'invalid' })

      expect(res.status).toBe(400)
    })
  })
})
