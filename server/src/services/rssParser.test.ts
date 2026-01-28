import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockParseURL = vi.fn()

vi.mock('rss-parser', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      parseURL: mockParseURL,
    })),
  }
})

const { parseFeed } = await import('./rssParser.js')

describe('parseFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('parses RSS items from feed', async () => {
    mockParseURL.mockResolvedValue({
      items: [
        {
          link: 'https://example.com/article-1',
          title: 'Article 1',
          isoDate: '2024-01-15T00:00:00Z',
          contentSnippet: 'A short description',
        },
        {
          link: 'https://example.com/article-2',
          title: 'Article 2',
          pubDate: 'Mon, 15 Jan 2024 00:00:00 GMT',
          content: '<p>HTML content</p>',
        },
      ],
    })

    const items = await parseFeed('https://example.com/rss')

    expect(items).toHaveLength(2)
    expect(items[0]).toEqual({
      url: 'https://example.com/article-1',
      title: 'Article 1',
      datePublished: '2024-01-15T00:00:00Z',
      description: 'A short description',
    })
    expect(items[1]).toEqual({
      url: 'https://example.com/article-2',
      title: 'Article 2',
      datePublished: 'Mon, 15 Jan 2024 00:00:00 GMT',
      description: '<p>HTML content</p>',
    })
  })

  it('skips items without links', async () => {
    mockParseURL.mockResolvedValue({
      items: [
        { title: 'No link' },
        { link: 'https://example.com/valid', title: 'Valid' },
      ],
    })

    const items = await parseFeed('https://example.com/rss')
    expect(items).toHaveLength(1)
    expect(items[0].url).toBe('https://example.com/valid')
  })

  it('limits to 20 items', async () => {
    const manyItems = Array.from({ length: 30 }, (_, i) => ({
      link: `https://example.com/article-${i}`,
      title: `Article ${i}`,
    }))
    mockParseURL.mockResolvedValue({ items: manyItems })

    const items = await parseFeed('https://example.com/rss')
    expect(items).toHaveLength(20)
  })

  it('defaults title to Untitled when missing', async () => {
    mockParseURL.mockResolvedValue({
      items: [{ link: 'https://example.com/no-title' }],
    })

    const items = await parseFeed('https://example.com/rss')
    expect(items[0].title).toBe('Untitled')
  })

  it('returns empty array on parse error', async () => {
    mockParseURL.mockRejectedValue(new Error('Network error'))

    const items = await parseFeed('https://bad-url.com/rss')
    expect(items).toEqual([])
  })
})
