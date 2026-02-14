import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAxiosGet = vi.hoisted(() => vi.fn())
const mockParseString = vi.hoisted(() => vi.fn())

vi.mock('axios', () => ({
  default: { get: mockAxiosGet },
}))

vi.mock('../lib/retry.js', () => ({
  withRetry: (fn: () => Promise<unknown>) => fn(),
  isRetryableError: () => true,
}))

vi.mock('rss-parser', () => {
  return {
    default: class MockParser {
      parseString = mockParseString
    },
  }
})

const { parseFeed } = await import('./rssParser.js')

function axiosResponse(data: string, status = 200, headers: Record<string, string> = {}) {
  return { status, data, headers }
}

describe('parseFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('parses RSS items from feed', async () => {
    mockAxiosGet.mockResolvedValue(axiosResponse('<rss></rss>'))
    mockParseString.mockResolvedValue({
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

    const result = await parseFeed('https://example.com/rss')

    expect(result.notModified).toBe(false)
    expect(result.items).toHaveLength(2)
    expect(result.items[0]).toEqual({
      url: 'https://example.com/article-1',
      title: 'Article 1',
      datePublished: '2024-01-15T00:00:00Z',
      description: 'A short description',
    })
    expect(result.items[1]).toEqual({
      url: 'https://example.com/article-2',
      title: 'Article 2',
      datePublished: 'Mon, 15 Jan 2024 00:00:00 GMT',
      description: '<p>HTML content</p>',
    })
  })

  it('skips items without links', async () => {
    mockAxiosGet.mockResolvedValue(axiosResponse('<rss></rss>'))
    mockParseString.mockResolvedValue({
      items: [
        { title: 'No link' },
        { link: 'https://example.com/valid', title: 'Valid' },
      ],
    })

    const result = await parseFeed('https://example.com/rss')
    expect(result.items).toHaveLength(1)
    expect(result.items[0].url).toBe('https://example.com/valid')
  })

  it('limits to configured item cap', async () => {
    const manyItems = Array.from({ length: 40 }, (_, i) => ({
      link: `https://example.com/article-${i}`,
      title: `Article ${i}`,
    }))
    mockAxiosGet.mockResolvedValue(axiosResponse('<rss></rss>'))
    mockParseString.mockResolvedValue({ items: manyItems })

    const result = await parseFeed('https://example.com/rss')
    expect(result.items).toHaveLength(30)
  })

  it('defaults title to Untitled when missing', async () => {
    mockAxiosGet.mockResolvedValue(axiosResponse('<rss></rss>'))
    mockParseString.mockResolvedValue({
      items: [{ link: 'https://example.com/no-title' }],
    })

    const result = await parseFeed('https://example.com/rss')
    expect(result.items[0].title).toBe('Untitled')
  })

  it('returns empty result on error', async () => {
    mockAxiosGet.mockRejectedValue(new Error('Network error'))

    const result = await parseFeed('https://bad-url.com/rss')
    expect(result.items).toEqual([])
    expect(result.notModified).toBe(false)
  })

  it('returns notModified true on 304 response', async () => {
    mockAxiosGet.mockResolvedValue(axiosResponse('', 304))

    const result = await parseFeed('https://example.com/rss', {
      etag: '"abc123"',
      lastModified: 'Sat, 01 Jan 2024 00:00:00 GMT',
    })

    expect(result.notModified).toBe(true)
    expect(result.items).toEqual([])
    expect(result.cacheHeaders.etag).toBe('"abc123"')
    expect(result.cacheHeaders.lastModified).toBe('Sat, 01 Jan 2024 00:00:00 GMT')
    expect(mockParseString).not.toHaveBeenCalled()
  })

  it('sends conditional headers when provided', async () => {
    mockAxiosGet.mockResolvedValue(axiosResponse('<rss></rss>'))
    mockParseString.mockResolvedValue({ items: [] })

    await parseFeed('https://example.com/rss', {
      etag: '"etag-value"',
      lastModified: 'Fri, 01 Dec 2023 00:00:00 GMT',
    })

    expect(mockAxiosGet).toHaveBeenCalledWith(
      'https://example.com/rss',
      expect.objectContaining({
        headers: expect.objectContaining({
          'If-None-Match': '"etag-value"',
          'If-Modified-Since': 'Fri, 01 Dec 2023 00:00:00 GMT',
        }),
      })
    )
  })

  it('extracts cache headers from response', async () => {
    mockAxiosGet.mockResolvedValue(axiosResponse('<rss></rss>', 200, {
      'etag': '"new-etag"',
      'last-modified': 'Sun, 15 Jan 2024 00:00:00 GMT',
    }))
    mockParseString.mockResolvedValue({ items: [] })

    const result = await parseFeed('https://example.com/rss')

    expect(result.cacheHeaders.etag).toBe('"new-etag"')
    expect(result.cacheHeaders.lastModified).toBe('Sun, 15 Jan 2024 00:00:00 GMT')
  })

  it('does not send conditional headers when none provided', async () => {
    mockAxiosGet.mockResolvedValue(axiosResponse('<rss></rss>'))
    mockParseString.mockResolvedValue({ items: [] })

    await parseFeed('https://example.com/rss')

    const callHeaders = mockAxiosGet.mock.calls[0][1].headers
    expect(callHeaders['If-None-Match']).toBeUndefined()
    expect(callHeaders['If-Modified-Since']).toBeUndefined()
  })

  it('passes maxContentLength and responseType to axios', async () => {
    mockAxiosGet.mockResolvedValue(axiosResponse('<rss></rss>'))
    mockParseString.mockResolvedValue({ items: [] })

    await parseFeed('https://example.com/rss')

    expect(mockAxiosGet).toHaveBeenCalledWith(
      'https://example.com/rss',
      expect.objectContaining({
        maxContentLength: 5 * 1024 * 1024,
        responseType: 'text',
      })
    )
  })
})
