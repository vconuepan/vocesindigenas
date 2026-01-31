import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockAxiosPost = vi.fn()
vi.mock('axios', () => ({
  default: { post: mockAxiosPost },
}))

const { notifyJobFailure } = await import('./notify.js')

describe('notifyJobFailure', () => {
  const originalEnv = process.env.WEBHOOK_URL

  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.WEBHOOK_URL
  })

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.WEBHOOK_URL = originalEnv
    } else {
      delete process.env.WEBHOOK_URL
    }
  })

  it('does nothing when WEBHOOK_URL is not set', async () => {
    await notifyJobFailure('crawl_feeds', 'connection timeout')
    expect(mockAxiosPost).not.toHaveBeenCalled()
  })

  it('sends POST to WEBHOOK_URL with job failure details', async () => {
    process.env.WEBHOOK_URL = 'https://hooks.example.com/webhook'
    mockAxiosPost.mockResolvedValue({ status: 200 })

    await notifyJobFailure('crawl_feeds', 'connection timeout')

    expect(mockAxiosPost).toHaveBeenCalledWith(
      'https://hooks.example.com/webhook',
      expect.objectContaining({
        content: 'Job **crawl_feeds** failed: connection timeout',
        text: 'Job "crawl_feeds" failed: connection timeout',
        jobName: 'crawl_feeds',
        error: 'connection timeout',
        timestamp: expect.any(String),
      }),
      { timeout: 5000 },
    )
  })

  it('includes ISO timestamp in payload', async () => {
    process.env.WEBHOOK_URL = 'https://hooks.example.com/webhook'
    mockAxiosPost.mockResolvedValue({ status: 200 })

    await notifyJobFailure('assess_stories', 'rate limit')

    const payload = mockAxiosPost.mock.calls[0][1]
    expect(() => new Date(payload.timestamp).toISOString()).not.toThrow()
  })

  it('does not throw when webhook request fails', async () => {
    process.env.WEBHOOK_URL = 'https://hooks.example.com/webhook'
    mockAxiosPost.mockRejectedValue(new Error('network error'))

    await expect(notifyJobFailure('crawl_feeds', 'oops')).resolves.toBeUndefined()
  })
})
