import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockParseFeed = vi.hoisted(() => vi.fn())
const mockExtractContent = vi.hoisted(() => vi.fn())
const mockGetExistingUrls = vi.hoisted(() => vi.fn())
const mockCreateStory = vi.hoisted(() => vi.fn())
const mockGetFeedById = vi.hoisted(() => vi.fn())
const mockGetDueFeeds = vi.hoisted(() => vi.fn())
const mockUpdateCrawlStatus = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const mockUpdateFeedCacheHeaders = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))

vi.mock('./rssParser.js', () => ({ parseFeed: mockParseFeed }))
vi.mock('./extractor.js', () => ({ extractContent: mockExtractContent }))
vi.mock('./story.js', () => ({
  getExistingUrls: mockGetExistingUrls,
  createStory: mockCreateStory,
}))
vi.mock('./feed.js', () => ({
  getFeedById: mockGetFeedById,
  getDueFeeds: mockGetDueFeeds,
  updateCrawlStatus: mockUpdateCrawlStatus,
  updateFeedCacheHeaders: mockUpdateFeedCacheHeaders,
}))

const { crawlFeed, crawlAllDueFeeds, crawlUrl } = await import('./crawler.js')

const sampleFeed = {
  id: 'feed-1',
  title: 'Test Feed',
  url: 'https://example.com/feed',
  htmlSelector: null,
  lastEtag: null,
  lastModified: null,
}

function rssResult(items: any[], opts?: { notModified?: boolean; etag?: string; lastModified?: string }) {
  return {
    items,
    notModified: opts?.notModified ?? false,
    cacheHeaders: {
      etag: opts?.etag ?? null,
      lastModified: opts?.lastModified ?? null,
    },
  }
}

describe('crawlFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws when feed not found', async () => {
    mockGetFeedById.mockResolvedValue(null)
    await expect(crawlFeed('nonexistent')).rejects.toThrow('Feed not found')
  })

  it('returns early with zero counts when RSS returns no items', async () => {
    mockGetFeedById.mockResolvedValue(sampleFeed)
    mockParseFeed.mockResolvedValue(rssResult([]))

    const result = await crawlFeed('feed-1')

    expect(result.newStories).toBe(0)
    expect(result.skipped).toBe(0)
    expect(result.errors).toBe(0)
    expect(mockUpdateCrawlStatus).toHaveBeenCalledWith('feed-1', expect.objectContaining({
      hadSuccess: true, newItemCount: 0, rssItemCount: 0,
    }))
  })

  it('handles 304 not modified response', async () => {
    mockGetFeedById.mockResolvedValue(sampleFeed)
    mockParseFeed.mockResolvedValue(rssResult([], { notModified: true }))

    const result = await crawlFeed('feed-1')

    expect(result.newStories).toBe(0)
    expect(mockUpdateCrawlStatus).toHaveBeenCalledWith('feed-1', expect.objectContaining({
      crawlResult: '304 not modified',
    }))
  })

  it('persists cache headers from RSS response', async () => {
    mockGetFeedById.mockResolvedValue(sampleFeed)
    mockParseFeed.mockResolvedValue(rssResult([], { etag: '"abc123"', lastModified: 'Sat, 01 Jan 2024 00:00:00 GMT' }))

    await crawlFeed('feed-1')

    expect(mockUpdateFeedCacheHeaders).toHaveBeenCalledWith('feed-1', {
      etag: '"abc123"',
      lastModified: 'Sat, 01 Jan 2024 00:00:00 GMT',
    })
  })

  it('passes stored cache headers to parseFeed', async () => {
    const feedWithCache = { ...sampleFeed, lastEtag: '"old-etag"', lastModified: 'Fri, 01 Dec 2023 00:00:00 GMT' }
    mockGetFeedById.mockResolvedValue(feedWithCache)
    mockParseFeed.mockResolvedValue(rssResult([]))

    await crawlFeed('feed-1')

    expect(mockParseFeed).toHaveBeenCalledWith('https://example.com/feed', {
      etag: '"old-etag"',
      lastModified: 'Fri, 01 Dec 2023 00:00:00 GMT',
    })
  })

  it('skips already-existing URLs', async () => {
    mockGetFeedById.mockResolvedValue(sampleFeed)
    mockParseFeed.mockResolvedValue(rssResult([
      { url: 'https://example.com/old', title: 'Old', datePublished: null, description: null },
      { url: 'https://example.com/new', title: 'New', datePublished: null, description: null },
    ]))
    mockGetExistingUrls.mockResolvedValue(new Set(['https://example.com/old']))
    mockExtractContent.mockResolvedValue({
      title: 'New Article',
      content: 'Some content',
      datePublished: null,
      method: 'readability',
    })
    mockCreateStory.mockResolvedValue({ id: 'story-1' })

    const result = await crawlFeed('feed-1')

    expect(result.skipped).toBe(1)
    expect(result.newStories).toBe(1)
    expect(mockCreateStory).toHaveBeenCalledTimes(1)
  })

  it('counts extraction failures as errors', async () => {
    mockGetFeedById.mockResolvedValue(sampleFeed)
    mockParseFeed.mockResolvedValue(rssResult([
      { url: 'https://example.com/fail', title: 'Fail', datePublished: null, description: null },
    ]))
    mockGetExistingUrls.mockResolvedValue(new Set())
    mockExtractContent.mockResolvedValue(null)

    const result = await crawlFeed('feed-1')

    expect(result.errors).toBe(1)
    expect(result.newStories).toBe(0)
    expect(mockCreateStory).not.toHaveBeenCalled()
  })

  it('builds error message when extraction failures occur', async () => {
    mockGetFeedById.mockResolvedValue(sampleFeed)
    mockParseFeed.mockResolvedValue(rssResult([
      { url: 'https://example.com/a', title: 'A', datePublished: null, description: null },
      { url: 'https://example.com/b', title: 'B', datePublished: null, description: null },
      { url: 'https://example.com/c', title: 'C', datePublished: null, description: null },
    ]))
    mockGetExistingUrls.mockResolvedValue(new Set())
    mockExtractContent
      .mockResolvedValueOnce({ title: 'A', content: 'Content', datePublished: null, method: 'readability' })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
    mockCreateStory.mockResolvedValue({ id: 'story-1' })

    const result = await crawlFeed('feed-1')

    expect(result.errors).toBe(2)
    expect(result.errorMessage).toBe('2 of 3 articles failed extraction')
    expect(mockUpdateCrawlStatus).toHaveBeenCalledWith('feed-1', expect.objectContaining({
      hadSuccess: true,
      errorMessage: '2 of 3 articles failed extraction',
      newItemCount: 3,
      rssItemCount: 3,
    }))
  })

  it('clears error on successful crawl with no failures', async () => {
    mockGetFeedById.mockResolvedValue(sampleFeed)
    mockParseFeed.mockResolvedValue(rssResult([
      { url: 'https://example.com/a', title: 'A', datePublished: null, description: null },
    ]))
    mockGetExistingUrls.mockResolvedValue(new Set())
    mockExtractContent.mockResolvedValue({
      title: 'A', content: 'Content', datePublished: null, method: 'readability',
    })
    mockCreateStory.mockResolvedValue({ id: 'story-1' })

    const result = await crawlFeed('feed-1')

    expect(result.errorMessage).toBeUndefined()
    expect(mockUpdateCrawlStatus).toHaveBeenCalledWith('feed-1', expect.objectContaining({
      hadSuccess: true,
      errorMessage: undefined,
      newItemCount: 1,
      rssItemCount: 1,
      crawlResult: '1 new article',
    }))
  })

  it('reports total failure when all articles fail extraction', async () => {
    mockGetFeedById.mockResolvedValue(sampleFeed)
    mockParseFeed.mockResolvedValue(rssResult([
      { url: 'https://example.com/a', title: 'A', datePublished: null, description: null },
      { url: 'https://example.com/b', title: 'B', datePublished: null, description: null },
    ]))
    mockGetExistingUrls.mockResolvedValue(new Set())
    mockExtractContent.mockResolvedValue(null)

    const result = await crawlFeed('feed-1')

    expect(result.errors).toBe(2)
    expect(result.newStories).toBe(0)
    expect(mockUpdateCrawlStatus).toHaveBeenCalledWith('feed-1', expect.objectContaining({
      hadSuccess: false,
      errorMessage: '2 of 2 articles failed extraction',
      newItemCount: 2,
      rssItemCount: 2,
    }))
  })

  it('uses extracted title over RSS title', async () => {
    mockGetFeedById.mockResolvedValue(sampleFeed)
    mockParseFeed.mockResolvedValue(rssResult([
      { url: 'https://example.com/article', title: 'RSS Title', datePublished: null, description: null },
    ]))
    mockGetExistingUrls.mockResolvedValue(new Set())
    mockExtractContent.mockResolvedValue({
      title: 'Better Title',
      content: 'Content here',
      datePublished: '2024-01-15',
      method: 'readability',
    })
    mockCreateStory.mockResolvedValue({ id: 'story-1' })

    await crawlFeed('feed-1')

    expect(mockCreateStory).toHaveBeenCalledWith(
      expect.objectContaining({ sourceTitle: 'Better Title' })
    )
  })

  it('passes htmlSelector to extractor', async () => {
    const feedWithSelector = { ...sampleFeed, htmlSelector: '.article-body' }
    mockGetFeedById.mockResolvedValue(feedWithSelector)
    mockParseFeed.mockResolvedValue(rssResult([
      { url: 'https://example.com/a', title: 'A', datePublished: null, description: null },
    ]))
    mockGetExistingUrls.mockResolvedValue(new Set())
    mockExtractContent.mockResolvedValue({
      title: 'A', content: 'Content', datePublished: null, method: 'selector',
    })
    mockCreateStory.mockResolvedValue({ id: 'story-1' })

    await crawlFeed('feed-1')

    expect(mockExtractContent).toHaveBeenCalledWith(
      'https://example.com/a',
      { htmlSelector: '.article-body' }
    )
  })
})

describe('crawlAllDueFeeds', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('crawls all due feeds and returns results', async () => {
    mockGetDueFeeds.mockResolvedValue([
      { id: 'feed-1', title: 'Feed 1' },
      { id: 'feed-2', title: 'Feed 2' },
    ])
    mockGetFeedById
      .mockResolvedValueOnce({ ...sampleFeed, id: 'feed-1', title: 'Feed 1' })
      .mockResolvedValueOnce({ ...sampleFeed, id: 'feed-2', title: 'Feed 2' })
    mockParseFeed.mockResolvedValue(rssResult([]))

    const results = await crawlAllDueFeeds()

    expect(results).toHaveLength(2)
    expect(mockGetDueFeeds).toHaveBeenCalled()
  })

  it('handles individual feed crawl failures gracefully', async () => {
    mockGetDueFeeds.mockResolvedValue([
      { id: 'feed-bad', title: 'Bad Feed' },
    ])
    mockGetFeedById.mockResolvedValue(null)

    const results = await crawlAllDueFeeds()

    expect(results).toHaveLength(1)
    expect(results[0].errors).toBe(1)
    expect(results[0].feedTitle).toBe('Bad Feed')
  })
})

describe('crawlUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws when feed not found', async () => {
    mockGetFeedById.mockResolvedValue(null)
    await expect(crawlUrl('https://example.com/article', 'bad-feed')).rejects.toThrow('Feed not found')
  })

  it('throws when URL already crawled', async () => {
    mockGetFeedById.mockResolvedValue(sampleFeed)
    mockGetExistingUrls.mockResolvedValue(new Set(['https://example.com/article']))

    await expect(crawlUrl('https://example.com/article', 'feed-1')).rejects.toThrow('URL already crawled')
  })

  it('returns null when extraction fails', async () => {
    mockGetFeedById.mockResolvedValue(sampleFeed)
    mockGetExistingUrls.mockResolvedValue(new Set())
    mockExtractContent.mockResolvedValue(null)

    const result = await crawlUrl('https://example.com/article', 'feed-1')
    expect(result).toBeNull()
  })

  it('creates story and returns storyId on success', async () => {
    mockGetFeedById.mockResolvedValue(sampleFeed)
    mockGetExistingUrls.mockResolvedValue(new Set())
    mockExtractContent.mockResolvedValue({
      title: 'Article Title',
      content: 'Article content',
      datePublished: '2024-01-15',
      method: 'readability',
    })
    mockCreateStory.mockResolvedValue({ id: 'new-story-id' })

    const result = await crawlUrl('https://example.com/article', 'feed-1')

    expect(result).toEqual({ storyId: 'new-story-id' })
    expect(mockCreateStory).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceUrl: 'https://example.com/article',
        sourceTitle: 'Article Title',
        sourceContent: 'Article content',
        feedId: 'feed-1',
      })
    )
  })
})
