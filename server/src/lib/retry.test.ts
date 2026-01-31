import { describe, it, expect, vi } from 'vitest'
import { withRetry, isRetryableError } from './retry.js'

describe('isRetryableError', () => {
  it('retries on timeout errors', () => {
    expect(isRetryableError(new Error('Request timeout'))).toBe(true)
    expect(isRetryableError(new Error('ECONNRESET'))).toBe(true)
    expect(isRetryableError(new Error('ECONNREFUSED'))).toBe(true)
    expect(isRetryableError(new Error('socket hang up'))).toBe(true)
  })

  it('retries on 429 status', () => {
    expect(isRetryableError({ response: { status: 429 } })).toBe(true)
  })

  it('retries on 5xx status codes', () => {
    expect(isRetryableError({ response: { status: 500 } })).toBe(true)
    expect(isRetryableError({ response: { status: 502 } })).toBe(true)
    expect(isRetryableError({ response: { status: 503 } })).toBe(true)
  })

  it('retries on network error codes', () => {
    expect(isRetryableError({ code: 'ECONNABORTED' })).toBe(true)
    expect(isRetryableError({ code: 'ETIMEDOUT' })).toBe(true)
  })

  it('does not retry on 4xx client errors', () => {
    expect(isRetryableError({ response: { status: 400 } })).toBe(false)
    expect(isRetryableError({ response: { status: 404 } })).toBe(false)
    expect(isRetryableError({ response: { status: 422 } })).toBe(false)
  })

  it('does not retry on generic errors', () => {
    expect(isRetryableError(new Error('some bug'))).toBe(false)
    expect(isRetryableError('string error')).toBe(false)
  })
})

// Helper: create an axios-like error with response status
function axiosError(status: number): Error & { response: { status: number } } {
  const err = new Error(`Request failed with status ${status}`) as Error & { response: { status: number } }
  err.response = { status }
  return err
}

describe('withRetry', () => {
  it('returns result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('success')

    const result = await withRetry(fn)

    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries on retryable error and succeeds', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(axiosError(503))
      .mockResolvedValue('recovered')

    const result = await withRetry(fn, { baseDelayMs: 1 })

    expect(result).toBe('recovered')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('throws after all retries exhausted', async () => {
    const fn = vi.fn().mockRejectedValue(axiosError(503))

    await expect(withRetry(fn, { retries: 2, baseDelayMs: 1 }))
      .rejects.toThrow('Request failed with status 503')
    expect(fn).toHaveBeenCalledTimes(3) // initial + 2 retries
  })

  it('does not retry non-retryable errors', async () => {
    const fn = vi.fn().mockRejectedValue(axiosError(400))

    await expect(withRetry(fn, { baseDelayMs: 1 }))
      .rejects.toThrow('Request failed with status 400')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('respects custom retryOn predicate', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('custom retryable'))
      .mockResolvedValue('ok')

    const result = await withRetry(fn, {
      baseDelayMs: 1,
      retryOn: (err) => err instanceof Error && err.message.includes('custom retryable'),
    })

    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('defaults to 3 retries', async () => {
    const fn = vi.fn().mockRejectedValue(axiosError(500))

    await expect(withRetry(fn, { baseDelayMs: 1 }))
      .rejects.toThrow('Request failed with status 500')
    expect(fn).toHaveBeenCalledTimes(4) // initial + 3 retries
  })
})
