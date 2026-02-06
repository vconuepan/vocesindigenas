# Plan: Smart lastCrawledAt Updates (Don't Advance on Total Failure)

## Goal

Currently `lastCrawledAt` updates even when every article fails extraction, meaning a temporarily broken site won't be retried until the next full interval. Only advance `lastCrawledAt` when the crawl had at least partial success.

## Current State

- `updateLastCrawled(feedId)` is called unconditionally at the end of `crawlFeed()` in `server/src/services/crawler.ts`
- Also called when RSS returns zero items (line 35)
- The feed-crawl-errors plan proposes replacing `updateLastCrawled()` with `updateCrawlStatus(id, error?)` — this plan builds on that

## Relationship to feed-crawl-errors Plan

The feed-crawl-errors plan already proposes `updateCrawlStatus(id, error?)` that:
- On success: sets `lastCrawledAt = now`, clears error fields
- On error: sets `lastCrawledAt = now`, sets error fields

This plan modifies that behavior: **on total failure, do NOT update `lastCrawledAt`** so the feed is retried sooner.

## Changes

### 1. Define success/failure conditions

| Scenario | Update lastCrawledAt? | Set error? |
|---|---|---|
| RSS fetch/parse failed | No | Yes |
| RSS returned 0 items (all dupes) | Yes | No |
| Some articles extracted, some failed | Yes | Yes (partial) |
| All articles failed extraction | No | Yes |
| All articles extracted successfully | Yes | No |

### 2. Modify crawler.ts to track success

**`server/src/services/crawler.ts`:**
- Track `successCount` and `failureCount` during article processing
- Only call `updateCrawlStatus(id)` (which sets `lastCrawledAt`) if `successCount > 0` or RSS returned zero items (no new URLs to process — this is normal "nothing new" not a failure)
- On total failure (RSS worked but all extractions failed): call `updateCrawlError(id, error)` without updating `lastCrawledAt`

### 3. Add retry backoff protection

Without `lastCrawledAt` advancing, a permanently broken feed would be retried every crawl cycle. Add protection:

- **Max retries before forcing advance**: after N consecutive total failures (e.g., 3), update `lastCrawledAt` anyway to prevent infinite retry loops
- Use the `consecutiveEmptyCrawls` or a similar counter from the feed-health-metrics plan, or add a `consecutiveFailedCrawls` field

### 4. Modify feed.ts

**`server/src/services/feed.ts`:**
- `updateCrawlStatus()` takes a result object:
  ```typescript
  type CrawlOutcome = {
    hadSuccess: boolean
    errorMessage?: string
    newItemCount: number
  }
  ```
- Logic:
  - If `hadSuccess` or `newItemCount === 0` (nothing new): update `lastCrawledAt`
  - If `!hadSuccess && newItemCount > 0`: don't update `lastCrawledAt`, set error
  - Always update error fields regardless

## Decisions

- **3 retries** before forcing `lastCrawledAt` advance (Option A)
- **Implement together with feed-crawl-errors** — they modify the same `updateCrawlStatus` function

## Testing

- Unit test: lastCrawledAt not updated on total extraction failure
- Unit test: lastCrawledAt updated on partial success
- Unit test: lastCrawledAt updated when RSS returns no new items
- Unit test: lastCrawledAt force-updated after N consecutive failures
- Unit test: RSS parse failure does not update lastCrawledAt
