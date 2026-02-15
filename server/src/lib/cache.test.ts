import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TTLCache, cached } from './cache.js'

describe('TTLCache', () => {
  let cache: TTLCache<string>

  beforeEach(() => {
    vi.useFakeTimers()
    cache = new TTLCache<string>(1000) // 1 second TTL
  })

  afterEach(() => {
    cache.destroy()
    vi.useRealTimers()
  })

  it('returns undefined for missing key', () => {
    expect(cache.get('nonexistent')).toBeUndefined()
  })

  it('stores and retrieves values', () => {
    cache.set('key1', 'value1')
    expect(cache.get('key1')).toBe('value1')
  })

  it('returns undefined for expired entries', () => {
    cache.set('key1', 'value1')
    expect(cache.get('key1')).toBe('value1')

    vi.advanceTimersByTime(1001) // Advance past TTL

    expect(cache.get('key1')).toBeUndefined()
  })

  it('does not expire entries before TTL', () => {
    cache.set('key1', 'value1')

    vi.advanceTimersByTime(999) // Just before TTL

    expect(cache.get('key1')).toBe('value1')
  })

  it('invalidates a specific key', () => {
    cache.set('key1', 'value1')
    cache.set('key2', 'value2')

    cache.invalidate('key1')

    expect(cache.get('key1')).toBeUndefined()
    expect(cache.get('key2')).toBe('value2')
  })

  it('clears all keys', () => {
    cache.set('key1', 'value1')
    cache.set('key2', 'value2')

    cache.clear()

    expect(cache.get('key1')).toBeUndefined()
    expect(cache.get('key2')).toBeUndefined()
  })

  it('overwrites existing values on set', () => {
    cache.set('key1', 'old')
    cache.set('key1', 'new')

    expect(cache.get('key1')).toBe('new')
  })

  it('resets TTL on overwrite', () => {
    cache.set('key1', 'value1')
    vi.advanceTimersByTime(800)

    // Overwrite resets the TTL
    cache.set('key1', 'value2')
    vi.advanceTimersByTime(800) // 800ms after overwrite, still within new TTL

    expect(cache.get('key1')).toBe('value2')
  })

  it('works with different value types', () => {
    const objCache = new TTLCache<{ count: number }>(1000)
    objCache.set('obj', { count: 42 })

    expect(objCache.get('obj')).toEqual({ count: 42 })
    objCache.destroy()
  })

  it('handles null values correctly', () => {
    const nullableCache = new TTLCache<string | null>(1000)
    nullableCache.set('key', null)

    // null is a valid cached value
    expect(nullableCache.get('key')).toBeNull()
    nullableCache.destroy()
  })

  it('sweep removes expired entries', () => {
    cache.set('expired1', 'val1')
    cache.set('expired2', 'val2')

    vi.advanceTimersByTime(1001) // Both entries now expired

    cache.set('fresh', 'val3') // Add a fresh entry

    const removed = cache.sweep()

    expect(removed).toBe(2)
    expect(cache.get('expired1')).toBeUndefined()
    expect(cache.get('expired2')).toBeUndefined()
    expect(cache.get('fresh')).toBe('val3')
  })

  it('sweep keeps non-expired entries', () => {
    cache.set('key1', 'val1')
    cache.set('key2', 'val2')

    const removed = cache.sweep()

    expect(removed).toBe(0)
    expect(cache.get('key1')).toBe('val1')
    expect(cache.get('key2')).toBe('val2')
  })
})

describe('cached', () => {
  let cache: TTLCache<string>

  beforeEach(() => {
    vi.useFakeTimers()
    cache = new TTLCache<string>(1000)
  })

  afterEach(() => {
    cache.destroy()
    vi.useRealTimers()
  })

  it('calls fn and caches the result', async () => {
    const fn = vi.fn().mockResolvedValue('result')

    const value = await cached(cache, 'key', fn)

    expect(value).toBe('result')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('returns cached value on second call without calling fn again', async () => {
    const fn = vi.fn().mockResolvedValue('result')

    await cached(cache, 'key', fn)
    const value = await cached(cache, 'key', fn)

    expect(value).toBe('result')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('calls fn again after TTL expires', async () => {
    const fn = vi.fn()
      .mockResolvedValueOnce('first')
      .mockResolvedValueOnce('second')

    const first = await cached(cache, 'key', fn)
    expect(first).toBe('first')

    vi.advanceTimersByTime(1001)

    const second = await cached(cache, 'key', fn)
    expect(second).toBe('second')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('uses different cache entries for different keys', async () => {
    const fn1 = vi.fn().mockResolvedValue('value1')
    const fn2 = vi.fn().mockResolvedValue('value2')

    await cached(cache, 'key1', fn1)
    await cached(cache, 'key2', fn2)

    expect(cache.get('key1')).toBe('value1')
    expect(cache.get('key2')).toBe('value2')
  })

  it('does not cache if fn throws', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('recovered')

    await expect(cached(cache, 'key', fn)).rejects.toThrow('fail')

    const value = await cached(cache, 'key', fn)
    expect(value).toBe('recovered')
    expect(fn).toHaveBeenCalledTimes(2)
  })
})
