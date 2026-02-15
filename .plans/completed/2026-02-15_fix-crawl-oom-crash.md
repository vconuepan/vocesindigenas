# Fix OOM Crash During Crawl Job

## Problem

The production server crashes with `FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory` during the `crawl_feeds` cron job. The heap reaches ~251 MB and V8 can't reclaim enough memory.

**Key observation:** The crash only happens on the scheduled cron job, not when triggered manually. The server has been running 21+ hours before the crash, meaning baseline memory is already elevated. The crawl job (79 feeds, 5 concurrent, 3 articles each = up to 15 JSDOM instances) pushes it over the edge.

Previous fixes (commit `77e0754`) capped response sizes and bounded caches, but the fundamental issue remains: too many concurrent JSDOM instances under memory pressure.

## Root Cause Analysis

1. **No `--max-old-space-size` configured.** The `start` script is bare `node dist/index.js`. On Render's 512 MB instance, V8 defaults to ~256 MB heap.
2. **High crawl concurrency.** 5 feeds x 3 articles = up to 15 concurrent JSDOM instances. Each JSDOM instance can use 5-20 MB (JSDOM has significant overhead on top of the parsed HTML), totaling 75-300 MB for JSDOM alone.
3. **TTLCache never sweeps expired entries.** Entries only expire on `get()`, so unreferenced entries linger until the key is accessed again. Minor contributor, but adds up over 21+ hours.

## Fixes

### 1. Increase V8 heap limit (`server/package.json`)

Change the `start` script to:
```
"start": "node --max-old-space-size=384 dist/index.js"
```

This gives V8 more headroom on the 512 MB instance while leaving ~128 MB for the OS, new-space, code, and non-heap allocations.

### 2. Reduce default crawl concurrency (`server/src/config.ts`)

- `crawlFeeds`: 5 → 3
- `crawlArticles`: 3 → 3

Max concurrent JSDOM instances drops from 15 to 9. Peak JSDOM memory drops from ~75-300 MB to ~45-180 MB. The crawl will take slightly longer but won't crash.

These remain overridable via env vars (`CONCURRENCY_CRAWL_FEEDS`, `CONCURRENCY_CRAWL_ARTICLES`).

### 3. Add periodic sweep to TTLCache (`server/src/lib/cache.ts`)

Add a `sweep()` method and call it periodically to evict expired entries proactively. This prevents entries from lingering in memory after their TTL expires.

## Testing

- Existing crawler tests validate concurrency behavior (no change to logic)
- Verify TTLCache sweep works via unit test
- Manual verification: trigger crawl manually, observe it still works

## Files to modify

1. `server/package.json` — `start` script
2. `server/src/config.ts` — concurrency defaults
3. `server/src/lib/cache.ts` — add sweep method
