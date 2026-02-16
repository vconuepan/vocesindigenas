import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { TEST_API_KEY } from '../../test/helpers.js'

vi.mock('express-rate-limit', () => ({
  default: () => (_req: any, _res: any, next: any) => next(),
}))

const mockPrisma = vi.hoisted(() => ({
  feedback: {
    create: vi.fn(),
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

describe('Public Feedback API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/feedback', () => {
    it('creates feedback successfully', async () => {
      mockPrisma.feedback.create.mockResolvedValue({
        id: 'fb-1',
        category: 'general',
        message: 'Great site!',
        email: null,
        status: 'unread',
      })

      const res = await request(app)
        .post('/api/feedback')
        .send({ category: 'general', message: 'Great site!' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(mockPrisma.feedback.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          category: 'general',
          message: 'Great site!',
          email: null,
          ipHash: expect.any(String),
        }),
      })
    })

    it('accepts feedback with email', async () => {
      mockPrisma.feedback.create.mockResolvedValue({ id: 'fb-2' })

      const res = await request(app)
        .post('/api/feedback')
        .send({ category: 'bug', message: 'Something broke', email: 'user@test.com' })

      expect(res.status).toBe(200)
      expect(mockPrisma.feedback.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          category: 'bug',
          email: 'user@test.com',
        }),
      })
    })

    it('silently rejects honeypot submissions', async () => {
      const res = await request(app)
        .post('/api/feedback')
        .send({ category: 'general', message: 'Bot message', website: 'http://spam.com' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(mockPrisma.feedback.create).not.toHaveBeenCalled()
    })

    it('returns 400 for missing category', async () => {
      const res = await request(app)
        .post('/api/feedback')
        .send({ message: 'No category' })

      expect(res.status).toBe(400)
    })

    it('returns 400 for empty message', async () => {
      const res = await request(app)
        .post('/api/feedback')
        .send({ category: 'general', message: '' })

      expect(res.status).toBe(400)
    })

    it('returns 400 for invalid category', async () => {
      const res = await request(app)
        .post('/api/feedback')
        .send({ category: 'invalid', message: 'Test' })

      expect(res.status).toBe(400)
    })

    it('returns 400 for invalid email format', async () => {
      const res = await request(app)
        .post('/api/feedback')
        .send({ category: 'general', message: 'Test', email: 'not-an-email' })

      expect(res.status).toBe(400)
    })

    it('returns 400 for message exceeding max length', async () => {
      const res = await request(app)
        .post('/api/feedback')
        .send({ category: 'general', message: 'a'.repeat(2001) })

      expect(res.status).toBe(400)
    })

    it('hashes the IP address', async () => {
      mockPrisma.feedback.create.mockResolvedValue({ id: 'fb-3' })

      await request(app)
        .post('/api/feedback')
        .send({ category: 'general', message: 'Test' })

      const call = mockPrisma.feedback.create.mock.calls[0][0]
      // ipHash should be a 64-char hex string (SHA-256)
      expect(call.data.ipHash).toMatch(/^[a-f0-9]{64}$/)
    })

    it('treats empty email string as null', async () => {
      mockPrisma.feedback.create.mockResolvedValue({ id: 'fb-4' })

      await request(app)
        .post('/api/feedback')
        .send({ category: 'general', message: 'Test', email: '' })

      expect(mockPrisma.feedback.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ email: null }),
      })
    })
  })
})
