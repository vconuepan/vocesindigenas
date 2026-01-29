import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { TEST_API_KEY } from '../../test/helpers.js'

vi.mock('express-rate-limit', () => ({
  default: () => (_req: any, _res: any, next: any) => next(),
}))

const mockPrisma = vi.hoisted(() => ({
  story: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
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

const publicStory = {
  id: 'story-1',
  url: 'https://example.com/article',
  title: 'Published Article',
  datePublished: new Date('2024-01-15'),
  dateCrawled: new Date('2024-01-14'),
  status: 'published',
  relevanceRatingLow: 7,
  relevanceRatingHigh: 9,
  emotionTag: 'uplifting',
  aiSummary: 'A test summary',
  aiQuote: 'A notable quote',
  aiKeywords: ['test', 'article'],
  aiMarketingBlurb: 'Read this article',
  aiRelevanceReasons: 'Very relevant',
  aiAntifactors: 'None',
  aiScenarios: 'Scenario A',
  feed: {
    title: 'Test Feed',
    issue: { name: 'AI & Technology', slug: 'ai-technology' },
  },
}

describe('Public Stories API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/stories', () => {
    it('returns published stories without auth', async () => {
      mockPrisma.story.findMany.mockResolvedValue([publicStory])
      mockPrisma.story.count.mockResolvedValue(1)

      const res = await request(app).get('/api/stories')
      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(1)
      expect(res.body.data[0].title).toBe('Published Article')
      expect(res.body.total).toBe(1)
      expect(res.body.page).toBe(1)
    })

    it('supports issueSlug filter', async () => {
      mockPrisma.story.findMany.mockResolvedValue([])
      mockPrisma.story.count.mockResolvedValue(0)

      const res = await request(app).get('/api/stories?issueSlug=ai-technology')
      expect(res.status).toBe(200)
    })

    it('supports pagination', async () => {
      mockPrisma.story.findMany.mockResolvedValue([])
      mockPrisma.story.count.mockResolvedValue(50)

      const res = await request(app).get('/api/stories?page=2&pageSize=10')
      expect(res.status).toBe(200)
      expect(res.body.page).toBe(2)
      expect(res.body.pageSize).toBe(10)
    })

    it('does not expose internal AI fields', async () => {
      mockPrisma.story.findMany.mockResolvedValue([publicStory])
      mockPrisma.story.count.mockResolvedValue(1)

      const res = await request(app).get('/api/stories')
      expect(res.status).toBe(200)
      // These internal fields should not be present
      expect(res.body.data[0].aiResponse).toBeUndefined()
      expect(res.body.data[0].aiRelevanceCalculation).toBeUndefined()
      expect(res.body.data[0].content).toBeUndefined()
    })
  })

  describe('GET /api/stories/:id', () => {
    it('returns a single published story', async () => {
      mockPrisma.story.findFirst.mockResolvedValue(publicStory)

      const res = await request(app).get('/api/stories/story-1')
      expect(res.status).toBe(200)
      expect(res.body.title).toBe('Published Article')
      expect(res.body.feed).toBeDefined()
    })

    it('returns 404 for non-published story', async () => {
      mockPrisma.story.findFirst.mockResolvedValue(null)

      const res = await request(app).get('/api/stories/not-published')
      expect(res.status).toBe(404)
    })
  })
})
