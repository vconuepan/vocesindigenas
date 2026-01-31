import { createLogger } from './logger.js'

const log = createLogger('retry')

interface RetryOptions {
  retries?: number
  baseDelayMs?: number
  retryOn?: (err: unknown) => boolean
}

export function isRetryableError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase()
    if (msg.includes('timeout') || msg.includes('econnreset') || msg.includes('econnrefused') || msg.includes('socket hang up')) {
      return true
    }
  }
  // Axios-style errors with response status
  const status = (err as any)?.response?.status
  if (typeof status === 'number') {
    return status === 429 || (status >= 500 && status < 600)
  }
  // Network errors (no response)
  if ((err as any)?.code === 'ECONNABORTED' || (err as any)?.code === 'ETIMEDOUT') {
    return true
  }
  return false
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const { retries = 3, baseDelayMs = 1000, retryOn = isRetryableError } = options

  let lastError: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (attempt >= retries || !retryOn(err)) {
        throw err
      }
      const delay = baseDelayMs * Math.pow(2, attempt)
      log.warn({ attempt: attempt + 1, retries, delayMs: delay, err }, 'retrying after error')
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  throw lastError
}
