import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAxiosGet = vi.hoisted(() => vi.fn())
const mockAxiosPost = vi.hoisted(() => vi.fn())
const mockReadabilityParse = vi.hoisted(() => vi.fn())

vi.mock('axios', () => ({
  default: {
    get: mockAxiosGet,
    post: mockAxiosPost,
  },
}))

vi.mock('jsdom', () => ({
  JSDOM: class MockJSDOM {
    window = { document: {} }
  },
}))

vi.mock('@mozilla/readability', () => ({
  Readability: class MockReadability {
    parse = mockReadabilityParse
  },
}))

const { extractContent } = await import('./extractor.js')

describe('extractContent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.PIPFEED_API_KEY
  })

  it('returns null when page fetch fails', async () => {
    mockAxiosGet.mockRejectedValue(new Error('Network error'))

    const result = await extractContent('https://example.com/article')
    expect(result).toBeNull()
  })

  it('extracts content using CSS selector (tier 1)', async () => {
    const longText = 'This is a substantial article body with enough text to pass the minimum length check. '.repeat(3)
    const html = `<html><head><title>Test Page</title></head><body><article class="content"><p>${longText}</p></article></body></html>`
    mockAxiosGet.mockResolvedValue({ data: html })

    const result = await extractContent('https://example.com/article', {
      htmlSelector: 'article.content',
    })

    expect(result).not.toBeNull()
    expect(result!.method).toBe('selector')
    expect(result!.title).toBe('Test Page')
    expect(result!.content.length).toBeGreaterThan(50)
  })

  it('falls back to readability when selector fails (tier 2)', async () => {
    const html = `<html><head><title>Test</title></head><body><p>Some content</p></body></html>`
    mockAxiosGet.mockResolvedValue({ data: html })
    mockReadabilityParse.mockReturnValue({
      title: 'Readability Title',
      textContent: 'A '.repeat(50),
    })

    const result = await extractContent('https://example.com/article', {
      htmlSelector: '.nonexistent-selector',
    })

    expect(result).not.toBeNull()
    expect(result!.method).toBe('readability')
    expect(result!.title).toBe('Readability Title')
  })

  it('uses readability when no selector provided', async () => {
    const html = `<html><body><p>Content</p></body></html>`
    mockAxiosGet.mockResolvedValue({ data: html })
    mockReadabilityParse.mockReturnValue({
      title: 'Article Title',
      textContent: 'Meaningful content '.repeat(10),
    })

    const result = await extractContent('https://example.com/article')

    expect(result).not.toBeNull()
    expect(result!.method).toBe('readability')
  })

  it('falls back to pipfeed when readability fails (tier 3)', async () => {
    process.env.PIPFEED_API_KEY = 'test-key'
    const html = `<html><body><p>Short</p></body></html>`
    mockAxiosGet.mockResolvedValue({ data: html })
    mockReadabilityParse.mockReturnValue(null)
    mockAxiosPost.mockResolvedValue({
      data: {
        title: 'PipFeed Title',
        text: 'A '.repeat(50),
        date: '2024-01-15',
      },
    })

    const result = await extractContent('https://example.com/article')

    expect(result).not.toBeNull()
    expect(result!.method).toBe('pipfeed')
    expect(result!.title).toBe('PipFeed Title')
    expect(result!.datePublished).toBe('2024-01-15')
  })

  it('returns null when all methods fail', async () => {
    const html = `<html><body><p>Short</p></body></html>`
    mockAxiosGet.mockResolvedValue({ data: html })
    mockReadabilityParse.mockReturnValue(null)

    const result = await extractContent('https://example.com/article')
    expect(result).toBeNull()
  })

  it('skips pipfeed when no API key set', async () => {
    const html = `<html><body><p>Short</p></body></html>`
    mockAxiosGet.mockResolvedValue({ data: html })
    mockReadabilityParse.mockReturnValue(null)

    const result = await extractContent('https://example.com/article')

    expect(result).toBeNull()
    expect(mockAxiosPost).not.toHaveBeenCalled()
  })

  it('skips selector extraction when content too short', async () => {
    const html = `<html><body><article class="content"><p>Short</p></article></body></html>`
    mockAxiosGet.mockResolvedValue({ data: html })
    mockReadabilityParse.mockReturnValue(null)

    const result = await extractContent('https://example.com/article', {
      htmlSelector: 'article.content',
    })

    // Selector finds "Short" (< 50 chars), falls through to readability (null), no pipfeed key
    expect(result).toBeNull()
  })
})
