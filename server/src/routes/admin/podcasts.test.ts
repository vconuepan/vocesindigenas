import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { authHeader, samplePodcast, sampleStory, TEST_API_KEY } from '../../test/helpers.js'

vi.mock('express-rate-limit', () => ({
  default: () => (_req: any, _res: any, next: any) => next(),
}))

const mockPrisma = vi.hoisted(() => ({
  podcast: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  story: {
    findMany: vi.fn(),
  },
  $disconnect: vi.fn(),
}))

vi.mock('../../lib/prisma.js', () => ({ default: mockPrisma }))
vi.mock('../../services/crawler.js', () => ({
  crawlFeed: vi.fn(),
  crawlAllDueFeeds: vi.fn(),
  crawlUrl: vi.fn(),
}))
vi.mock('../../services/llm.js', () => ({
  getSmallLLM: vi.fn(() => ({
    withStructuredOutput: vi.fn(() => ({
      invoke: vi.fn().mockResolvedValue({ script: 'Generated podcast script' }),
    })),
  })),
  getLargeLLM: vi.fn(),
  rateLimitDelay: vi.fn().mockResolvedValue(undefined),
}))

process.env.PUBLIC_API_KEY = TEST_API_KEY

const { default: app } = await import('../../app.js')

describe('Admin Podcasts API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/admin/podcasts', () => {
    it('returns 401 without auth header', async () => {
      const res = await request(app).get('/api/admin/podcasts')
      expect(res.status).toBe(401)
    })

    it('returns paginated podcasts', async () => {
      const podcasts = [samplePodcast(), samplePodcast({ id: 'podcast-2', title: 'Episode 2' })]
      mockPrisma.podcast.findMany.mockResolvedValue(podcasts)
      mockPrisma.podcast.count.mockResolvedValue(2)

      const res = await request(app)
        .get('/api/admin/podcasts')
        .set(authHeader())
      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(2)
      expect(res.body.total).toBe(2)
    })

    it('filters by status', async () => {
      mockPrisma.podcast.findMany.mockResolvedValue([])
      mockPrisma.podcast.count.mockResolvedValue(0)

      const res = await request(app)
        .get('/api/admin/podcasts?status=published')
        .set(authHeader())
      expect(res.status).toBe(200)
    })
  })

  describe('GET /api/admin/podcasts/:id', () => {
    it('returns a single podcast', async () => {
      mockPrisma.podcast.findUnique.mockResolvedValue(samplePodcast())

      const res = await request(app)
        .get('/api/admin/podcasts/podcast-1')
        .set(authHeader())
      expect(res.status).toBe(200)
      expect(res.body.title).toBe('Episode #1')
    })

    it('returns 404 for unknown podcast', async () => {
      mockPrisma.podcast.findUnique.mockResolvedValue(null)

      const res = await request(app)
        .get('/api/admin/podcasts/unknown')
        .set(authHeader())
      expect(res.status).toBe(404)
    })
  })

  describe('POST /api/admin/podcasts', () => {
    it('creates a new podcast', async () => {
      mockPrisma.podcast.create.mockResolvedValue(samplePodcast())

      const res = await request(app)
        .post('/api/admin/podcasts')
        .set(authHeader())
        .send({ title: 'Episode #1' })
      expect(res.status).toBe(201)
      expect(res.body.title).toBe('Episode #1')
    })

    it('returns 400 for missing title', async () => {
      const res = await request(app)
        .post('/api/admin/podcasts')
        .set(authHeader())
        .send({})
      expect(res.status).toBe(400)
    })
  })

  describe('PUT /api/admin/podcasts/:id', () => {
    it('updates a podcast', async () => {
      const updated = samplePodcast({ title: 'Updated' })
      mockPrisma.podcast.update.mockResolvedValue(updated)

      const res = await request(app)
        .put('/api/admin/podcasts/podcast-1')
        .set(authHeader())
        .send({ title: 'Updated' })
      expect(res.status).toBe(200)
      expect(res.body.title).toBe('Updated')
    })

    it('returns 404 for unknown podcast', async () => {
      mockPrisma.podcast.update.mockRejectedValue({ code: 'P2025' })

      const res = await request(app)
        .put('/api/admin/podcasts/unknown')
        .set(authHeader())
        .send({ title: 'Test' })
      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /api/admin/podcasts/:id', () => {
    it('deletes a podcast', async () => {
      mockPrisma.podcast.delete.mockResolvedValue(samplePodcast())

      const res = await request(app)
        .delete('/api/admin/podcasts/podcast-1')
        .set(authHeader())
      expect(res.status).toBe(204)
    })

    it('returns 404 for unknown podcast', async () => {
      mockPrisma.podcast.delete.mockRejectedValue({ code: 'P2025' })

      const res = await request(app)
        .delete('/api/admin/podcasts/unknown')
        .set(authHeader())
      expect(res.status).toBe(404)
    })
  })

  describe('POST /api/admin/podcasts/:id/assign', () => {
    it('assigns stories to podcast', async () => {
      const podcast = samplePodcast()
      const stories = [{ id: 'story-1' }, { id: 'story-2' }]
      mockPrisma.podcast.findUnique.mockResolvedValue(podcast)
      mockPrisma.story.findMany.mockResolvedValue(stories)
      mockPrisma.podcast.update.mockResolvedValue(
        samplePodcast({ storyIds: ['story-1', 'story-2'] }),
      )

      const res = await request(app)
        .post('/api/admin/podcasts/podcast-1/assign')
        .set(authHeader())
      expect(res.status).toBe(200)
      expect(res.body.storyIds).toEqual(['story-1', 'story-2'])
    })

    it('returns 404 for unknown podcast', async () => {
      mockPrisma.podcast.findUnique.mockResolvedValue(null)

      const res = await request(app)
        .post('/api/admin/podcasts/unknown/assign')
        .set(authHeader())
      expect(res.status).toBe(404)
    })
  })

  describe('POST /api/admin/podcasts/:id/generate', () => {
    it('generates podcast script', async () => {
      const podcast = samplePodcast({ storyIds: ['story-1'] })
      const story = sampleStory({
        status: 'published',
        summary: 'Test summary',
        relevanceReasons: 'Test reasons',
        antifactors: 'Test antifactors',
        feed: { title: 'BBC', issue: { name: 'AI & Technology' } },
      })
      mockPrisma.podcast.findUnique.mockResolvedValue(podcast)
      mockPrisma.story.findMany.mockResolvedValue([story])
      mockPrisma.podcast.update.mockResolvedValue(
        samplePodcast({ script: 'Generated script' }),
      )

      const res = await request(app)
        .post('/api/admin/podcasts/podcast-1/generate')
        .set(authHeader())
      expect(res.status).toBe(200)
    })

    it('returns 404 for unknown podcast', async () => {
      mockPrisma.podcast.findUnique.mockResolvedValue(null)

      const res = await request(app)
        .post('/api/admin/podcasts/unknown/generate')
        .set(authHeader())
      expect(res.status).toBe(404)
    })

    it('returns 400 when no stories assigned', async () => {
      mockPrisma.podcast.findUnique.mockResolvedValue(samplePodcast({ storyIds: [] }))

      const res = await request(app)
        .post('/api/admin/podcasts/podcast-1/generate')
        .set(authHeader())
      expect(res.status).toBe(400)
    })
  })
})
