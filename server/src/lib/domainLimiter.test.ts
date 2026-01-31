import { describe, it, expect, vi, afterEach } from 'vitest'
import { DomainLimiter } from './domainLimiter.js'

describe('DomainLimiter', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('limits concurrent requests to the same domain', async () => {
    const limiter = new DomainLimiter(1, 0) // 1 concurrent, no delay
    const order: string[] = []

    const p1 = limiter.run('https://example.com/a', async () => {
      order.push('start-1')
      await new Promise(r => setTimeout(r, 50))
      order.push('end-1')
      return 1
    })

    const p2 = limiter.run('https://example.com/b', async () => {
      order.push('start-2')
      await new Promise(r => setTimeout(r, 10))
      order.push('end-2')
      return 2
    })

    const results = await Promise.all([p1, p2])

    expect(results).toEqual([1, 2])
    // With concurrency 1, second request must wait for first to finish
    expect(order).toEqual(['start-1', 'end-1', 'start-2', 'end-2'])
  })

  it('allows concurrent requests to different domains', async () => {
    const limiter = new DomainLimiter(1, 0)
    const order: string[] = []

    const p1 = limiter.run('https://alpha.com/a', async () => {
      order.push('start-alpha')
      await new Promise(r => setTimeout(r, 50))
      order.push('end-alpha')
    })

    const p2 = limiter.run('https://beta.com/b', async () => {
      order.push('start-beta')
      await new Promise(r => setTimeout(r, 10))
      order.push('end-beta')
    })

    await Promise.all([p1, p2])

    // Both should start before either ends since they're different domains
    expect(order.indexOf('start-alpha')).toBeLessThan(order.indexOf('end-alpha'))
    expect(order.indexOf('start-beta')).toBeLessThan(order.indexOf('end-beta'))
    expect(order.indexOf('start-beta')).toBeLessThan(order.indexOf('end-alpha'))
  })

  it('enforces minimum delay between requests to the same domain', async () => {
    const minDelay = 100
    const limiter = new DomainLimiter(2, minDelay)
    const times: number[] = []

    // Run two sequential requests
    await limiter.run('https://example.com/1', async () => {
      times.push(Date.now())
    })
    await limiter.run('https://example.com/2', async () => {
      times.push(Date.now())
    })

    const elapsed = times[1] - times[0]
    expect(elapsed).toBeGreaterThanOrEqual(minDelay - 10) // small tolerance
  })

  it('does not enforce delay on first request', async () => {
    const limiter = new DomainLimiter(2, 200)
    const start = Date.now()

    await limiter.run('https://example.com/1', async () => {})

    const elapsed = Date.now() - start
    expect(elapsed).toBeLessThan(50)
  })

  it('cleans up stale domain entries', async () => {
    const limiter = new DomainLimiter(2, 0)

    await limiter.run('https://stale.com/a', async () => {})
    await limiter.run('https://fresh.com/b', async () => {})

    expect(limiter.size).toBe(2)

    // Advance time by 11 minutes for the stale entry
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 11 * 60 * 1000)

    const removed = limiter.cleanup()

    expect(removed).toBe(2) // Both are stale after 11 minutes
    expect(limiter.size).toBe(0)
  })

  it('returns function result', async () => {
    const limiter = new DomainLimiter(2, 0)
    const result = await limiter.run('https://example.com/a', async () => 42)
    expect(result).toBe(42)
  })

  it('propagates errors', async () => {
    const limiter = new DomainLimiter(2, 0)
    await expect(
      limiter.run('https://example.com/a', async () => {
        throw new Error('test error')
      })
    ).rejects.toThrow('test error')
  })
})
