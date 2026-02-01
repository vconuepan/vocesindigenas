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

  it('handles 304 not modified response (preserves existing errors)', async () => {
    mockGetFeedById.mockResolvedValue(sampleFeed)
    mockParseFeed.mockResolvedValue(rssResult([], { notModified: true }))

    const result = await crawlFeed('feed-1')

    expect(result.newStories).toBe(0)
    expect(mockUpdateCrawlStatus).toHaveBeenCalledWith('feed-1', expect.objectContaining({
      hadSuccess: false,
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

  it('does not claim success when all items are skipped (preserves previous error)', async () => {
    mockGetFeedById.mockResolvedValue(sampleFeed)
    mockParseFeed.mockResolvedValue(rssResult([
      { url: 'https://example.com/old1', title: 'Old 1', datePublished: null, description: null },
      { url: 'https://example.com/old2', title: 'Old 2', datePublished: null, description: null },
    ]))
    mockGetExistingUrls.mockResolvedValue(new Set(['https://example.com/old1', 'https://example.com/old2']))

    const result = await crawlFeed('feed-1')

    expect(result.newStories).toBe(0)
    expect(result.skipped).toBe(2)
    // hadSuccess should be false (0 new > 0 is false), so updateCrawlStatus
    // won't clear existing error fields
    expect(mockUpdateCrawlStatus).toHaveBeenCalledWith('feed-1', expect.objectContaining({
      hadSuccess: false,
      errorMessage: undefined,
      newItemCount: 0,
      rssItemCount: 2,
    }))
  })

  it('clears error when crawl has genuine new successes', async () => {
    mockGetFeedById.mockResolvedValue(sampleFeed)
    mockParseFeed.mockResolvedValue(rssResult([
      { url: 'https://example.com/new1', title: 'New 1', datePublished: null, description: null },
    ]))
    mockGetExistingUrls.mockResolvedValue(new Set())
    mockExtractContent.mockResolvedValue({
      title: 'New 1', content: 'Content', datePublished: null, method: 'readability',
    })
    mockCreateStory.mockResolvedValue({ id: 'story-1' })

    const result = await crawlFeed('feed-1')

    expect(result.newStories).toBe(1)
    // hadSuccess is true, so updateCrawlStatus will clear error fields
    expect(mockUpdateCrawlStatus).toHaveBeenCalledWith('feed-1', expect.objectContaining({
      hadSuccess: true,
      errorMessage: undefined,
    }))
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
      { htmlSelector: '.article-body', skipLocalExtraction: false }
    )
  })

  it('skips local extraction after consecutive API-only successes reach threshold', async () => {
    // With concurrency=3, the first 3 articles run concurrently (all with skipLocal=false).
    // Use concurrency=1 via 5 sequential articles to test threshold (default 3).
    mockGetFeedById.mockResolvedValue(sampleFeed)
    const items = Array.from({ length: 5 }, (_, i) => ({
      url: `https://example.com/art-${i}`,
      title: `Art ${i}`,
      datePublished: null,
      description: null,
    }))
    mockParseFeed.mockResolvedValue(rssResult(items))
    mockGetExistingUrls.mockResolvedValue(new Set())
    // All return API method (diffbot)
    mockExtractContent.mockResolvedValue({
      title: 'T', content: 'Content', datePublished: null, method: 'diffbot',
    })
    mockCreateStory.mockResolvedValue({ id: 'story-1' })

    await crawlFeed('feed-1')

    // The first crawlArticles (3) articles run concurrently with skipLocal=false.
    // After those 3 complete (all diffbot), localFailCount=3 → skipLocal=true.
    // Articles 4 and 5 should have skipLocalExtraction=true.
    const calls = mockExtractContent.mock.calls
    expect(calls).toHaveLength(5)
    // First 3 calls: skipLocalExtraction=false (concurrent batch)
    expect(calls[0][1]).toEqual({ htmlSelector: null, skipLocalExtraction: false })
    expect(calls[1][1]).toEqual({ htmlSelector: null, skipLocalExtraction: false })
    expect(calls[2][1]).toEqual({ htmlSelector: null, skipLocalExtraction: false })
    // Remaining calls: skipLocalExtraction=true
    expect(calls[3][1]).toEqual({ htmlSelector: null, skipLocalExtraction: true })
    expect(calls[4][1]).toEqual({ htmlSelector: null, skipLocalExtraction: true })
  })

  it('skips remaining articles after consecutive total extraction failures', async () => {
    mockGetFeedById.mockResolvedValue(sampleFeed)
    const items = Array.from({ length: 6 }, (_, i) => ({
      url: `https://example.com/art-${i}`,
      title: `Art ${i}`,
      datePublished: null,
      description: null,
    }))
    mockParseFeed.mockResolvedValue(rssResult(items))
    mockGetExistingUrls.mockResolvedValue(new Set())
    // All extractions return null (total failure)
    mockExtractContent.mockResolvedValue(null)

    const result = await crawlFeed('feed-1')

    // First 3 (concurrent batch) attempt extraction → all fail → totalFailCount=3 → skipAll=true
    // Articles 4-6 are skipped entirely without calling extractContent
    expect(mockExtractContent).toHaveBeenCalledTimes(3)
    expect(result.errors).toBe(6)
  })

  it('resets total fail count when extraction succeeds', async () => {
    mockGetFeedById.mockResolvedValue(sampleFeed)
    const items = Array.from({ length: 6 }, (_, i) => ({
      url: `https://example.com/art-${i}`,
      title: `Art ${i}`,
      datePublished: null,
      description: null,
    }))
    mockParseFeed.mockResolvedValue(rssResult(items))
    mockGetExistingUrls.mockResolvedValue(new Set())
    // First 2 fail, 3rd succeeds, 4th+5th+6th fail
    mockExtractContent
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ title: 'T', content: 'C', datePublished: null, method: 'diffbot' })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
    mockCreateStory.mockResolvedValue({ id: 'story-1' })

    const result = await crawlFeed('feed-1')

    // All 6 should be attempted: the success at article 3 resets totalFailCount.
    // After articles 4-6 fail (count=3), skipAll would be true but there are no more articles.
    expect(mockExtractContent).toHaveBeenCalledTimes(6)
    expect(result.newStories).toBe(1)
    expect(result.errors).toBe(5)
  })

  it('resets local fail count when a local extraction method succeeds', async () => {
    mockGetFeedById.mockResolvedValue(sampleFeed)
    const items = Array.from({ length: 5 }, (_, i) => ({
      url: `https://example.com/art-${i}`,
      title: `Art ${i}`,
      datePublished: null,
      description: null,
    }))
    mockParseFeed.mockResolvedValue(rssResult(items))
    mockGetExistingUrls.mockResolvedValue(new Set())
    // First 2 → diffbot, 3rd → readability (resets counter), 4th+5th → diffbot
    mockExtractContent
      .mockResolvedValueOnce({ title: 'T', content: 'C', datePublished: null, method: 'diffbot' })
      .mockResolvedValueOnce({ title: 'T', content: 'C', datePublished: null, method: 'diffbot' })
      .mockResolvedValueOnce({ title: 'T', content: 'C', datePublished: null, method: 'readability' })
      .mockResolvedValueOnce({ title: 'T', content: 'C', datePublished: null, method: 'diffbot' })
      .mockResolvedValueOnce({ title: 'T', content: 'C', datePublished: null, method: 'diffbot' })
    mockCreateStory.mockResolvedValue({ id: 'story-1' })

    await crawlFeed('feed-1')

    const calls = mockExtractContent.mock.calls
    expect(calls).toHaveLength(5)
    // All should have skipLocalExtraction=false because the readability success resets the counter.
    // With concurrency=3, first 3 run together (all false). Article 3 is readability → resets to 0.
    // Articles 4 and 5: counter was reset, so 2 diffbot results → count=2, still < 3.
    for (const call of calls) {
      expect(call[1]).toEqual(expect.objectContaining({ skipLocalExtraction: false }))
    }
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
