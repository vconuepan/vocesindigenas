interface CacheEntry<T> {
  value: T
  expiresAt: number
}

const SWEEP_INTERVAL_MS = 10 * 60 * 1000 // 10 minutes

export class TTLCache<T> {
  private store = new Map<string, CacheEntry<T>>()
  private sweepTimer: ReturnType<typeof setInterval> | null = null

  constructor(private readonly ttlMs: number) {
    this.sweepTimer = setInterval(() => this.sweep(), SWEEP_INTERVAL_MS)
    if (this.sweepTimer && typeof this.sweepTimer === 'object' && 'unref' in this.sweepTimer) {
      this.sweepTimer.unref()
    }
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key)
    if (!entry) return undefined
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return undefined
    }
    return entry.value
  }

  set(key: string, value: T): void {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs })
  }

  invalidate(key: string): void {
    this.store.delete(key)
  }

  clear(): void {
    this.store.clear()
  }

  /** Remove all expired entries. Called automatically every 10 minutes. */
  sweep(): number {
    const now = Date.now()
    let removed = 0
    for (const [key, entry] of this.store) {
      if (entry.expiresAt <= now) {
        this.store.delete(key)
        removed++
      }
    }
    return removed
  }

  destroy(): void {
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer)
      this.sweepTimer = null
    }
    this.store.clear()
  }
}

/** Wrap an async function with caching. */
export function cached<T>(cache: TTLCache<T>, key: string, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key)
  if (hit !== undefined) return Promise.resolve(hit)
  return fn().then(value => {
    cache.set(key, value)
    return value
  })
}
