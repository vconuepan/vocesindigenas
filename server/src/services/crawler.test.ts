import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockParseFeed = vi.hoisted(() => vi.fn())
const mockExtractContent = vi.hoisted(() => vi.fn())
const mockGetExistingUrls = vi.hoisted(() => vi.fn())
const mockCreateStory = vi.hoisted(() => vi.fn())
const mockGetFeedById = vi.hoisted(() => vi.fn())
const mockGetDueFeeds = vi.hoisted(() => vi.fn())
const mockUpdateLastCrawled = vi.hoisted(() => vi.fn())

vi.mock('./rssParser.js', () => ({ parseFeed: mockParseFeed }))
vi.mock('./extractor.js', () => ({ extractContent: mockExtractContent }))
vi.mock('./story.js', () => ({
  getExistingUrls: mockGetExistingUrls,
  createStory: mockCreateStory,
}))
vi.mock('./feed.js', () => ({
  getFeedById: mockGetFeedById,
  getDueFeeds: mockGetDueFeeds,
  updateLastCrawled: mockUpdateLastCrawled,
}))

const { crawlFeed, crawlAllDueFeeds, crawlUrl } = await import('./crawler.js')

const sampleFeed = {
  id: 'feed-1',
  title: 'Test Feed',
  url: 'https://example.com/feed',
  htmlSelector: null,
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
    mockParseFeed.mockResolvedValue([])

    const result = await crawlFeed('feed-1')

    expect(result.newStories).toBe(0)
    expect(result.skipped).toBe(0)
    expect(result.errors).toBe(0)
    expect(mockUpdateLastCrawled).toHaveBeenCalledWith('feed-1')
  })

  it('skips already-existing URLs', async () => {
    mockGetFeedById.mockResolvedValue(sampleFeed)
    mockParseFeed.mockResolvedValue([
      { url: 'https://example.com/old', title: 'Old', datePublished: null, description: null },
      { url: 'https://example.com/new', title: 'New', datePublished: null, description: null },
    ])
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
    mockParseFeed.mockResolvedValue([
      { url: 'https://example.com/fail', title: 'Fail', datePublished: null, description: null },
    ])
    mockGetExistingUrls.mockResolvedValue(new Set())
    mockExtractContent.mockResolvedValue(null)

    const result = await crawlFeed('feed-1')

    expect(result.errors).toBe(1)
    expect(result.newStories).toBe(0)
    expect(mockCreateStory).not.toHaveBeenCalled()
  })

  it('uses extracted title over RSS title', async () => {
    mockGetFeedById.mockResolvedValue(sampleFeed)
    mockParseFeed.mockResolvedValue([
      { url: 'https://example.com/article', title: 'RSS Title', datePublished: null, description: null },
    ])
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
    mockParseFeed.mockResolvedValue([
      { url: 'https://example.com/a', title: 'A', datePublished: null, description: null },
    ])
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
    mockParseFeed.mockResolvedValue([])

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
