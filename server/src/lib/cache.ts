interface CacheEntry<T> {
  value: T
  expiresAt: number
}

export class TTLCache<T> {
  private store = new Map<string, CacheEntry<T>>()

  constructor(private readonly ttlMs: number) {}

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
