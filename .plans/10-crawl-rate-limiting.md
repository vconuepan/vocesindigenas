# Plan: Per-Domain and Global Rate Limiting for Crawling

## Goal

Add rate limiting to prevent aggressive crawling behavior:
1. **Per-domain concurrency limit**: prevent hammering a single domain when multiple feeds or articles target it
2. **Global request delay**: add minimum delay between HTTP requests to avoid being flagged as a scraper

## Current State

- Two semaphores control concurrency:
  - `crawlFeeds` (default 5): max parallel feed crawls
  - `crawlArticles` (default 3): max parallel article extractions per feed
- No per-domain awareness — if 3 feeds point to nytimes.com, all their articles can be fetched simultaneously
- No delay between requests — only concurrency limits

## Changes

### 1. Per-domain concurrency limiter

**`server/src/lib/domainLimiter.ts`:**

```typescript
class DomainLimiter {
  private semaphores: Map<string, Semaphore> = new Map()
  private maxPerDomain: number

  constructor(maxPerDomain: number) {
    this.maxPerDomain = maxPerDomain
  }

  async acquire(url: string): Promise<() => void> {
    const domain = new URL(url).hostname
    if (!this.semaphores.has(domain)) {
      this.semaphores.set(domain, new Semaphore(this.maxPerDomain))
    }
    return this.semaphores.get(domain)!.acquire()
  }
}
```

- Create a single `DomainLimiter` instance shared across all crawl operations
- Default: 2 concurrent requests per domain

### 2. Global request delay

**`server/src/lib/domainLimiter.ts`** (extend the class):

- Track last request time per domain
- Before each request, wait until `lastRequestTime + minDelay` has passed
- Default delay: 200ms between requests to the same domain

### 3. Apply to article extraction

**`server/src/services/extractor.ts`:**
- Wrap HTTP calls (axios fetch, PipFeed API) with `domainLimiter.acquire(url)`
- The limiter handles both concurrency and delay

**`server/src/services/rssParser.ts`:**
- Wrap RSS fetch with `domainLimiter.acquire(feedUrl)`

### 4. Config

**`server/src/config.ts`:**
```typescript
crawl: {
  maxConcurrencyPerDomain: parseInt(process.env.MAX_CONCURRENCY_PER_DOMAIN || '2', 10),
  minDelayPerDomainMs: parseInt(process.env.MIN_DELAY_PER_DOMAIN_MS || '200', 10),
}
```

### 5. Cleanup

The `DomainLimiter` map could grow unbounded. Add a cleanup mechanism:
- Remove domain entries that haven't been used in 10 minutes
- Or use a simple LRU with max size (e.g., 100 domains)

## Decisions

- **Per-domain delay only** (Option A) — 200ms between requests to same domain, no global delay
- **LLM calls stay separate** — domain limiter only covers feed provider requests

## Testing

- Unit test: DomainLimiter limits concurrent requests to same domain
- Unit test: DomainLimiter allows concurrent requests to different domains
- Unit test: Minimum delay between requests to same domain is respected
- Unit test: Cleanup removes stale domain entries
- Integration test: Multiple feeds on same domain are rate-limited
