import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { authHeader, sampleStory, sampleFeed, sampleIssue, TEST_API_KEY } from '../../test/helpers.js'

vi.mock('express-rate-limit', () => ({
  default: () => (_req: any, _res: any, next: any) => next(),
}))

const mockPrisma = vi.hoisted(() => ({
  issue: {
    findUnique: vi.fn(),
  },
  feed: {
    findUnique: vi.fn(),
  },
  story: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  },
  $disconnect: vi.fn(),
}))

vi.mock('../../lib/prisma.js', () => ({ default: mockPrisma }))
vi.mock('../../services/crawler.js', () => ({
  crawlFeed: vi.fn(),
  crawlAllDueFeeds: vi.fn(),
  crawlUrl: vi.fn(),
}))

const mockPreAssessStories = vi.hoisted(() => vi.fn())
const mockAssessStory = vi.hoisted(() => vi.fn())
const mockSelectStories = vi.hoisted(() => vi.fn())

vi.mock('../../services/analysis.js', () => ({
  preAssessStories: mockPreAssessStories,
  assessStory: mockAssessStory,
  selectStories: mockSelectStories,
}))

process.env.PUBLIC_API_KEY = TEST_API_KEY

const { default: app } = await import('../../app.js')

const storyWithRelations = {
  ...sampleStory(),
  feed: { ...sampleFeed(), issue: sampleIssue() },
}

describe('Admin Stories API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/admin/stories', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/admin/stories')
      expect(res.status).toBe(401)
    })

    it('returns paginated stories', async () => {
      mockPrisma.story.findMany.mockResolvedValue([storyWithRelations])
      mockPrisma.story.count.mockResolvedValue(1)

      const res = await request(app)
        .get('/api/admin/stories')
        .set(authHeader())
      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(1)
      expect(res.body.total).toBe(1)
      expect(res.body.page).toBe(1)
      expect(res.body.totalPages).toBe(1)
    })

    it('supports status filter', async () => {
      mockPrisma.story.findMany.mockResolvedValue([])
      mockPrisma.story.count.mockResolvedValue(0)

      const res = await request(app)
        .get('/api/admin/stories?status=fetched')
        .set(authHeader())
      expect(res.status).toBe(200)
    })

    it('supports pagination', async () => {
      mockPrisma.story.findMany.mockResolvedValue([])
      mockPrisma.story.count.mockResolvedValue(50)

      const res = await request(app)
        .get('/api/admin/stories?page=2&pageSize=10')
        .set(authHeader())
      expect(res.status).toBe(200)
      expect(res.body.page).toBe(2)
      expect(res.body.pageSize).toBe(10)
    })

    it('supports sorting', async () => {
      mockPrisma.story.findMany.mockResolvedValue([])
      mockPrisma.story.count.mockResolvedValue(0)

      const res = await request(app)
        .get('/api/admin/stories?sort=rating_desc')
        .set(authHeader())
      expect(res.status).toBe(200)
    })

    it('rejects invalid query params', async () => {
      const res = await request(app)
        .get('/api/admin/stories?status=invalid')
        .set(authHeader())
      expect(res.status).toBe(400)
    })
  })

  describe('GET /api/admin/stories/stats', () => {
    it('returns story counts by status', async () => {
      mockPrisma.story.groupBy.mockResolvedValue([
        { status: 'fetched', _count: { status: 10 } },
        { status: 'published', _count: { status: 5 } },
      ])

      const res = await request(app)
        .get('/api/admin/stories/stats')
        .set(authHeader())
      expect(res.status).toBe(200)
      expect(res.body.fetched).toBe(10)
      expect(res.body.published).toBe(5)
    })
  })

  describe('GET /api/admin/stories/:id', () => {
    it('returns a single story with relations', async () => {
      mockPrisma.story.findUnique.mockResolvedValue(storyWithRelations)

      const res = await request(app)
        .get('/api/admin/stories/story-1')
        .set(authHeader())
      expect(res.status).toBe(200)
      expect(res.body.title).toBe('Test Article')
      expect(res.body.feed).toBeDefined()
    })

    it('returns 404 for unknown story', async () => {
      mockPrisma.story.findUnique.mockResolvedValue(null)

      const res = await request(app)
        .get('/api/admin/stories/unknown')
        .set(authHeader())
      expect(res.status).toBe(404)
    })
  })

  describe('POST /api/admin/stories', () => {
    it('creates a story', async () => {
      mockPrisma.feed.findUnique.mockResolvedValue(sampleFeed())
      mockPrisma.story.create.mockResolvedValue(sampleStory())

      const res = await request(app)
        .post('/api/admin/stories')
        .set(authHeader())
        .send({
          url: 'https://example.com/article',
          title: 'Test Article',
          content: 'Test content',
          feedId: '00000000-0000-0000-0000-000000000001',
        })
      expect(res.status).toBe(201)
    })

    it('returns 400 for missing fields', async () => {
      const res = await request(app)
        .post('/api/admin/stories')
        .set(authHeader())
        .send({})
      expect(res.status).toBe(400)
    })

    it('returns 400 when feed not found', async () => {
      mockPrisma.feed.findUnique.mockResolvedValue(null)

      const res = await request(app)
        .post('/api/admin/stories')
        .set(authHeader())
        .send({
          url: 'https://example.com/article',
          title: 'Test',
          content: 'Content',
          feedId: '00000000-0000-0000-0000-000000000000',
        })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Feed not found')
    })

    it('returns 409 for duplicate URL', async () => {
      mockPrisma.feed.findUnique.mockResolvedValue(sampleFeed())
      mockPrisma.story.create.mockRejectedValue({ code: 'P2002' })

      const res = await request(app)
        .post('/api/admin/stories')
        .set(authHeader())
        .send({
          url: 'https://example.com/article',
          title: 'Test',
          content: 'Content',
          feedId: '00000000-0000-0000-0000-000000000001',
        })
      expect(res.status).toBe(409)
    })
  })

  describe('PUT /api/admin/stories/:id', () => {
    it('updates a story', async () => {
      mockPrisma.story.update.mockResolvedValue(sampleStory({ title: 'Updated' }))

      const res = await request(app)
        .put('/api/admin/stories/story-1')
        .set(authHeader())
        .send({ title: 'Updated' })
      expect(res.status).toBe(200)
    })

    it('returns 404 for unknown story', async () => {
      mockPrisma.story.update.mockRejectedValue({ code: 'P2025' })

      const res = await request(app)
        .put('/api/admin/stories/unknown')
        .set(authHeader())
        .send({ title: 'Updated' })
      expect(res.status).toBe(404)
    })
  })

  describe('PUT /api/admin/stories/:id/status', () => {
    it('updates story status', async () => {
      mockPrisma.story.update.mockResolvedValue(sampleStory({ status: 'published' }))

      const res = await request(app)
        .put('/api/admin/stories/story-1/status')
        .set(authHeader())
        .send({ status: 'published' })
      expect(res.status).toBe(200)
    })

    it('rejects invalid status', async () => {
      const res = await request(app)
        .put('/api/admin/stories/story-1/status')
        .set(authHeader())
        .send({ status: 'invalid' })
      expect(res.status).toBe(400)
    })
  })

  describe('POST /api/admin/stories/bulk-status', () => {
    it('bulk updates story statuses', async () => {
      mockPrisma.story.updateMany.mockResolvedValue({ count: 3 })

      const res = await request(app)
        .post('/api/admin/stories/bulk-status')
        .set(authHeader())
        .send({
          ids: [
            '00000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-000000000002',
            '00000000-0000-0000-0000-000000000003',
          ],
          status: 'published',
        })
      expect(res.status).toBe(200)
      expect(res.body.updated).toBe(3)
    })

    it('rejects empty ids array', async () => {
      const res = await request(app)
        .post('/api/admin/stories/bulk-status')
        .set(authHeader())
        .send({ ids: [], status: 'published' })
      expect(res.status).toBe(400)
    })
  })

  describe('POST /api/admin/stories/preassess', () => {
    it('pre-assesses stories with given IDs', async () => {
      mockPreAssessStories.mockResolvedValue([
        { storyId: '00000000-0000-0000-0000-000000000001', rating: 4, emotionTag: 'surprising' },
      ])

      const res = await request(app)
        .post('/api/admin/stories/preassess')
        .set(authHeader())
        .send({ storyIds: ['00000000-0000-0000-0000-000000000001'] })
      expect(res.status).toBe(200)
      expect(res.body.processed).toBe(1)
      expect(res.body.results[0].rating).toBe(4)
    })

    it('pre-assesses all fetched stories when no IDs given', async () => {
      mockPrisma.story.findMany.mockResolvedValue([
        { ...sampleStory({ id: 'story-1' }), feed: { ...sampleFeed(), issue: sampleIssue() } },
      ])
      mockPreAssessStories.mockResolvedValue([
        { storyId: 'story-1', rating: 3, emotionTag: 'calm' },
      ])

      const res = await request(app)
        .post('/api/admin/stories/preassess')
        .set(authHeader())
        .send({})
      expect(res.status).toBe(200)
      expect(res.body.processed).toBe(1)
    })

    it('returns empty results when no fetched stories', async () => {
      mockPrisma.story.findMany.mockResolvedValue([])

      const res = await request(app)
        .post('/api/admin/stories/preassess')
        .set(authHeader())
        .send({})
      expect(res.status).toBe(200)
      expect(res.body.processed).toBe(0)
    })
  })

  describe('POST /api/admin/stories/:id/assess', () => {
    it('assesses a single story', async () => {
      mockAssessStory.mockResolvedValue(undefined)
      mockPrisma.story.findUnique.mockResolvedValue(storyWithRelations)

      const res = await request(app)
        .post('/api/admin/stories/story-1/assess')
        .set(authHeader())
      expect(res.status).toBe(200)
      expect(mockAssessStory).toHaveBeenCalledWith('story-1')
    })

    it('returns 404 when story not found', async () => {
      mockAssessStory.mockRejectedValue(new Error('Story not found'))

      const res = await request(app)
        .post('/api/admin/stories/unknown/assess')
        .set(authHeader())
      expect(res.status).toBe(404)
    })
  })

  describe('POST /api/admin/stories/select', () => {
    it('selects stories from given IDs', async () => {
      mockSelectStories.mockResolvedValue({
        selected: ['00000000-0000-0000-0000-000000000001'],
        rejected: ['00000000-0000-0000-0000-000000000002'],
      })

      const res = await request(app)
        .post('/api/admin/stories/select')
        .set(authHeader())
        .send({
          storyIds: [
            '00000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-000000000002',
          ],
        })
      expect(res.status).toBe(200)
      expect(res.body.selected).toHaveLength(1)
      expect(res.body.rejected).toHaveLength(1)
    })

    it('rejects empty storyIds', async () => {
      const res = await request(app)
        .post('/api/admin/stories/select')
        .set(authHeader())
        .send({ storyIds: [] })
      expect(res.status).toBe(400)
    })
  })

  describe('POST /api/admin/stories/:id/publish', () => {
    it('publishes a story', async () => {
      mockPrisma.story.update.mockResolvedValue(sampleStory({ status: 'published' }))

      const res = await request(app)
        .post('/api/admin/stories/story-1/publish')
        .set(authHeader())
      expect(res.status).toBe(200)
    })

    it('returns 404 for unknown story', async () => {
      mockPrisma.story.update.mockRejectedValue({ code: 'P2025' })

      const res = await request(app)
        .post('/api/admin/stories/unknown/publish')
        .set(authHeader())
      expect(res.status).toBe(404)
    })
  })

  describe('POST /api/admin/stories/:id/reject', () => {
    it('rejects a story', async () => {
      mockPrisma.story.update.mockResolvedValue(sampleStory({ status: 'rejected' }))

      const res = await request(app)
        .post('/api/admin/stories/story-1/reject')
        .set(authHeader())
      expect(res.status).toBe(200)
    })

    it('returns 404 for unknown story', async () => {
      mockPrisma.story.update.mockRejectedValue({ code: 'P2025' })

      const res = await request(app)
        .post('/api/admin/stories/unknown/reject')
        .set(authHeader())
      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /api/admin/stories/:id', () => {
    it('deletes a story', async () => {
      mockPrisma.story.delete.mockResolvedValue(sampleStory())

      const res = await request(app)
        .delete('/api/admin/stories/story-1')
        .set(authHeader())
      expect(res.status).toBe(204)
    })

    it('returns 404 for unknown story', async () => {
      mockPrisma.story.delete.mockRejectedValue({ code: 'P2025' })

      const res = await request(app)
        .delete('/api/admin/stories/unknown')
        .set(authHeader())
      expect(res.status).toBe(404)
    })
  })
})
