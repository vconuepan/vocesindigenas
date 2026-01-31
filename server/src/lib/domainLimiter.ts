import { Semaphore } from './semaphore.js'

interface DomainEntry {
  semaphore: Semaphore
  lastRequestTime: number
  lastUsed: number
}

const CLEANUP_INTERVAL_MS = 10 * 60 * 1000 // 10 minutes

export class DomainLimiter {
  private domains = new Map<string, DomainEntry>()
  private cleanupTimer: ReturnType<typeof setInterval> | null = null

  constructor(
    private readonly maxPerDomain: number,
    private readonly minDelayMs: number,
  ) {}

  private getEntry(domain: string): DomainEntry {
    let entry = this.domains.get(domain)
    if (!entry) {
      entry = {
        semaphore: new Semaphore(this.maxPerDomain),
        lastRequestTime: 0,
        lastUsed: Date.now(),
      }
      this.domains.set(domain, entry)
    }
    return entry
  }

  async run<T>(url: string, fn: () => Promise<T>): Promise<T> {
    const domain = new URL(url).hostname
    const entry = this.getEntry(domain)

    return entry.semaphore.run(async () => {
      // Enforce per-domain delay
      const now = Date.now()
      const elapsed = now - entry.lastRequestTime
      if (elapsed < this.minDelayMs && entry.lastRequestTime > 0) {
        await new Promise(resolve => setTimeout(resolve, this.minDelayMs - elapsed))
      }

      entry.lastRequestTime = Date.now()
      entry.lastUsed = entry.lastRequestTime
      return fn()
    })
  }

  /** Remove domain entries unused for the cleanup interval */
  cleanup(): number {
    const cutoff = Date.now() - CLEANUP_INTERVAL_MS
    let removed = 0
    for (const [domain, entry] of this.domains) {
      if (entry.lastUsed < cutoff) {
        this.domains.delete(domain)
        removed++
      }
    }
    return removed
  }

  /** Start periodic cleanup */
  startCleanup(): void {
    if (this.cleanupTimer) return
    this.cleanupTimer = setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS)
    // Don't hold the process open
    if (this.cleanupTimer && typeof this.cleanupTimer === 'object' && 'unref' in this.cleanupTimer) {
      this.cleanupTimer.unref()
    }
  }

  /** Stop periodic cleanup */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }

  /** Number of tracked domains (for testing) */
  get size(): number {
    return this.domains.size
  }
}
