import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

vi.mock('express-rate-limit', () => ({
  default: () => (_req: any, _res: any, next: any) => next(),
}))

const mockPrisma = vi.hoisted(() => ({
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

const { default: app } = await import('../../app.js')
const { sitemapCache } = await import('./sitemap.js')

const publishedStories = [
  { slug: 'ai-breakthrough-2024', datePublished: new Date('2024-06-15') },
  { slug: 'climate-summit-results', datePublished: new Date('2024-06-14') },
  { slug: 'space-mission-launch', datePublished: new Date('2024-06-13') },
]

describe('GET /api/sitemap.xml', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sitemapCache.clear()
  })

  it('returns valid XML with correct content type', async () => {
    mockPrisma.story.findMany.mockResolvedValue(publishedStories)

    const res = await request(app).get('/api/sitemap.xml')

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/application\/xml/)
    expect(res.text).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(res.text).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
  })

  it('includes static routes', async () => {
    mockPrisma.story.findMany.mockResolvedValue([])

    const res = await request(app).get('/api/sitemap.xml')

    expect(res.text).toContain('<loc>https://actuallyrelevant.news/</loc>')
    expect(res.text).toContain('<loc>https://actuallyrelevant.news/issues</loc>')
    expect(res.text).toContain('<loc>https://actuallyrelevant.news/about</loc>')
    expect(res.text).toContain('<loc>https://actuallyrelevant.news/methodology</loc>')
  })

  it('includes story URLs with lastmod', async () => {
    mockPrisma.story.findMany.mockResolvedValue(publishedStories)

    const res = await request(app).get('/api/sitemap.xml')

    expect(res.text).toContain('<loc>https://actuallyrelevant.news/stories/ai-breakthrough-2024</loc>')
    expect(res.text).toContain('<loc>https://actuallyrelevant.news/stories/climate-summit-results</loc>')
    expect(res.text).toContain('<loc>https://actuallyrelevant.news/stories/space-mission-launch</loc>')
    expect(res.text).toContain('<lastmod>2024-06-15</lastmod>')
  })

  it('sets Cache-Control header', async () => {
    mockPrisma.story.findMany.mockResolvedValue([])

    const res = await request(app).get('/api/sitemap.xml')

    expect(res.headers['cache-control']).toMatch(/public/)
    expect(res.headers['cache-control']).toMatch(/max-age=3600/)
  })

  it('queries only published stories with slugs', async () => {
    mockPrisma.story.findMany.mockResolvedValue([])

    await request(app).get('/api/sitemap.xml')

    expect(mockPrisma.story.findMany).toHaveBeenCalledWith({
      where: { status: 'published', slug: { not: null } },
      select: { slug: true, datePublished: true },
      orderBy: { datePublished: 'desc' },
    })
  })

  it('uses cached response on second request', async () => {
    mockPrisma.story.findMany.mockResolvedValue(publishedStories)

    // First request — hits DB
    const res1 = await request(app).get('/api/sitemap.xml')
    expect(res1.status).toBe(200)

    // Second request — should use cache
    const res2 = await request(app).get('/api/sitemap.xml')
    expect(res2.status).toBe(200)
    expect(res2.text).toBe(res1.text)

    // DB was only called once
    expect(mockPrisma.story.findMany).toHaveBeenCalledTimes(1)
  })

  it('returns 500 on database error', async () => {
    mockPrisma.story.findMany.mockRejectedValue(new Error('DB connection failed'))

    const res = await request(app).get('/api/sitemap.xml')

    expect(res.status).toBe(500)
    expect(res.body.error).toBe('Failed to generate sitemap')
  })
})
