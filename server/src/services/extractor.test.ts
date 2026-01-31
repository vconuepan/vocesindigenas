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

const { extractContent, _resetDiffbotQuota } = await import('./extractor.js')

const LONG_TEXT = 'A '.repeat(200)

describe('extractContent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.PIPFEED_API_KEY
    delete process.env.DIFFBOT_TOKEN
    _resetDiffbotQuota()
  })

  it('returns null when page fetch fails and no API keys', async () => {
    mockAxiosGet.mockRejectedValue(new Error('Network error'))

    const result = await extractContent('https://example.com/article')
    expect(result).toBeNull()
  })

  it('falls back to pipfeed when page fetch fails', async () => {
    process.env.PIPFEED_API_KEY = 'test-key'
    mockAxiosGet.mockRejectedValue(new Error('Network error'))
    mockAxiosPost.mockResolvedValue({
      data: { title: 'PipFeed Title', text: LONG_TEXT, date: '2024-01-15' },
    })

    const result = await extractContent('https://example.com/article')

    expect(result).not.toBeNull()
    expect(result!.method).toBe('pipfeed')
    expect(result!.title).toBe('PipFeed Title')
  })

  it('extracts content using CSS selector (tier 1)', async () => {
    const longText = 'This is a substantial article body with enough text to pass the minimum length check. '.repeat(5)
    const html = `<html><head><title>Test Page</title></head><body><article class="content"><p>${longText}</p></article></body></html>`
    mockAxiosGet.mockResolvedValue({ data: html })

    const result = await extractContent('https://example.com/article', {
      htmlSelector: 'article.content',
    })

    expect(result).not.toBeNull()
    expect(result!.method).toBe('selector')
    expect(result!.title).toBe('Test Page')
    expect(result!.content.length).toBeGreaterThan(300)
  })

  it('falls back to readability when selector fails (tier 2)', async () => {
    const html = `<html><head><title>Test</title></head><body><p>Some content</p></body></html>`
    mockAxiosGet.mockResolvedValue({ data: html })
    mockReadabilityParse.mockReturnValue({
      title: 'Readability Title',
      textContent: LONG_TEXT,
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
      textContent: 'Meaningful content '.repeat(20),
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
      data: { title: 'PipFeed Title', text: LONG_TEXT, date: '2024-01-15' },
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

  it('rejects content below minimum length threshold', async () => {
    const shortContent = 'x'.repeat(299)
    const html = `<html><body><p>${shortContent}</p></body></html>`
    mockAxiosGet.mockResolvedValue({ data: html })
    mockReadabilityParse.mockReturnValue({
      title: 'Title',
      textContent: shortContent,
    })

    const result = await extractContent('https://example.com/article')
    expect(result).toBeNull()
  })

  it('accepts content at minimum length threshold', async () => {
    const exactContent = 'x'.repeat(300)
    const html = `<html><body><p>${exactContent}</p></body></html>`
    mockAxiosGet.mockResolvedValue({ data: html })
    mockReadabilityParse.mockReturnValue({
      title: 'Title',
      textContent: exactContent,
    })

    const result = await extractContent('https://example.com/article')
    expect(result).not.toBeNull()
    expect(result!.method).toBe('readability')
  })

  it('skips selector extraction when content too short', async () => {
    const html = `<html><body><article class="content"><p>Short</p></article></body></html>`
    mockAxiosGet.mockResolvedValue({ data: html })
    mockReadabilityParse.mockReturnValue(null)

    const result = await extractContent('https://example.com/article', {
      htmlSelector: 'article.content',
    })

    // Selector finds "Short" (< 300 chars), falls through to readability (null), no API keys
    expect(result).toBeNull()
  })
})

describe('Diffbot extraction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.PIPFEED_API_KEY
    delete process.env.DIFFBOT_TOKEN
    _resetDiffbotQuota()
  })

  it('extracts content via Diffbot when readability fails', async () => {
    process.env.DIFFBOT_TOKEN = 'test-token'
    const html = `<html><body><p>Short</p></body></html>`
    // First GET: page fetch; Second GET: Diffbot API
    mockAxiosGet
      .mockResolvedValueOnce({ data: html })
      .mockResolvedValueOnce({
        data: {
          objects: [{
            title: 'Diffbot Title',
            text: LONG_TEXT,
            date: '2024-06-15',
          }],
        },
      })
    mockReadabilityParse.mockReturnValue(null)

    const result = await extractContent('https://example.com/article')

    expect(result).not.toBeNull()
    expect(result!.method).toBe('diffbot')
    expect(result!.title).toBe('Diffbot Title')
    expect(result!.datePublished).toBe('2024-06-15')
  })

  it('skips Diffbot when no DIFFBOT_TOKEN', async () => {
    const html = `<html><body><p>Short</p></body></html>`
    mockAxiosGet.mockResolvedValue({ data: html })
    mockReadabilityParse.mockReturnValue(null)

    const result = await extractContent('https://example.com/article')

    expect(result).toBeNull()
  })

  it('returns null when Diffbot returns insufficient content', async () => {
    process.env.DIFFBOT_TOKEN = 'test-token'
    const html = `<html><body><p>Short</p></body></html>`
    mockAxiosGet
      .mockResolvedValueOnce({ data: html })
      .mockResolvedValueOnce({
        data: { objects: [{ title: 'Title', text: 'Too short' }] },
      })
    mockReadabilityParse.mockReturnValue(null)

    const result = await extractContent('https://example.com/article')
    expect(result).toBeNull()
  })

  it('uses estimatedDate when date is absent', async () => {
    process.env.DIFFBOT_TOKEN = 'test-token'
    const html = `<html><body><p>Short</p></body></html>`
    mockAxiosGet
      .mockResolvedValueOnce({ data: html })
      .mockResolvedValueOnce({
        data: {
          objects: [{
            title: 'Title',
            text: LONG_TEXT,
            estimatedDate: '2024-05-01',
          }],
        },
      })
    mockReadabilityParse.mockReturnValue(null)

    const result = await extractContent('https://example.com/article')

    expect(result).not.toBeNull()
    expect(result!.datePublished).toBe('2024-05-01')
  })

  it('falls back to PipFeed when Diffbot fails', async () => {
    process.env.DIFFBOT_TOKEN = 'test-token'
    process.env.PIPFEED_API_KEY = 'test-key'
    const html = `<html><body><p>Short</p></body></html>`
    mockAxiosGet
      .mockResolvedValueOnce({ data: html }) // page fetch
      .mockRejectedValueOnce(new Error('Diffbot error')) // Diffbot fails
    mockReadabilityParse.mockReturnValue(null)
    mockAxiosPost.mockResolvedValue({
      data: { title: 'PipFeed Fallback', text: LONG_TEXT, date: '2024-01-01' },
    })

    const result = await extractContent('https://example.com/article')

    expect(result).not.toBeNull()
    expect(result!.method).toBe('pipfeed')
    expect(result!.title).toBe('PipFeed Fallback')
  })

  it('skips Diffbot after quota exhaustion (429)', async () => {
    process.env.DIFFBOT_TOKEN = 'test-token'
    const html = `<html><body><p>Short</p></body></html>`

    // Create a 429 error that looks like an Axios error
    const quotaError = Object.assign(new Error('Rate limited'), {
      isAxiosError: true,
      response: { status: 429 },
    })

    mockAxiosGet
      .mockResolvedValueOnce({ data: html }) // page fetch
      .mockRejectedValueOnce(quotaError)     // Diffbot 429
    mockReadabilityParse.mockReturnValue(null)

    // First call - hits 429
    const result1 = await extractContent('https://example.com/article1')
    expect(result1).toBeNull()

    // Second call - Diffbot should be skipped entirely
    mockAxiosGet.mockResolvedValueOnce({ data: html }) // page fetch only
    mockReadabilityParse.mockReturnValue(null)

    const result2 = await extractContent('https://example.com/article2')
    expect(result2).toBeNull()

    // Verify Diffbot was NOT called for the second article (only page fetch)
    // Call count: 1st page fetch + 1st Diffbot + 2nd page fetch = 3
    expect(mockAxiosGet).toHaveBeenCalledTimes(3)
  })

  it('returns null when both Diffbot and PipFeed have no API keys', async () => {
    const html = `<html><body><p>Short</p></body></html>`
    mockAxiosGet.mockResolvedValue({ data: html })
    mockReadabilityParse.mockReturnValue(null)

    const result = await extractContent('https://example.com/article')
    expect(result).toBeNull()
  })
})
