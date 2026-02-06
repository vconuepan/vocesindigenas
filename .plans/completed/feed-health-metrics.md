# Plan: Feed Health Metrics (Empty Result / Stale Feed Detection)

## Goal

Track consecutive empty crawl results so admins can detect feeds that have moved, gone stale, or stopped publishing — even when the feed URL still returns valid XML with zero items.

## Current State

- No tracking of empty results or consecutive failures
- `lastCrawledAt` updates on every crawl regardless of outcome
- The feed-crawl-errors plan covers *error* persistence (parse failures, extraction failures) but not the case where a feed returns valid XML with zero new items repeatedly

## Changes

### 1. Database: Add health tracking fields to Feed model

```prisma
consecutiveEmptyCrawls  Int       @default(0) @map("consecutive_empty_crawls")
lastSuccessfulCrawlAt   DateTime? @map("last_successful_crawl_at")
```

- `consecutiveEmptyCrawls`: incremented when a crawl returns 0 new items (after dedup), reset to 0 when items are found
- `lastSuccessfulCrawlAt`: set only when at least one new story is successfully created

**Files:** `server/prisma/schema.prisma`, new migration SQL

### 2. Backend: Update health metrics in crawler

**`server/src/services/crawler.ts`:**
- After deduplication, if `newItems.length === 0`: increment `consecutiveEmptyCrawls`
- If `newItems.length > 0` and at least one extraction succeeds: reset `consecutiveEmptyCrawls` to 0 and set `lastSuccessfulCrawlAt = now`

**`server/src/services/feed.ts`:**
- Add `updateCrawlHealth(id, { hadNewItems: boolean })` function (or integrate into the `updateCrawlStatus` from the feed-crawl-errors plan)

### 3. Frontend: Show health indicator in feed table

**`client/src/components/admin/FeedTable.tsx`:**
- When `consecutiveEmptyCrawls >= 5` (configurable threshold): show a "stale" indicator (gray/muted icon) next to the feed title
- Tooltip: "No new articles in last N crawls (last success: date)"
- Distinct from the error indicator (amber) from feed-crawl-errors — this is informational, not an error

### 4. Config

Add threshold to `server/src/config.ts`:

```typescript
crawl: {
  staleAfterEmptyCrawls: parseInt(process.env.STALE_AFTER_EMPTY_CRAWLS || '5', 10),
}
```

### 5. Shared types

Add `consecutiveEmptyCrawls: number` and `lastSuccessfulCrawlAt: string | null` to the `Feed` interface.

## Coordination with feed-crawl-errors Plan

The feed-crawl-errors plan adds `updateCrawlStatus(id, error?)`. This plan's health tracking should be integrated into the same function to avoid multiple DB updates per crawl. Implementation order:

1. Implement feed-crawl-errors first (adds `updateCrawlStatus`)
2. This plan extends `updateCrawlStatus` with health metrics

## Decisions

- **No auto-disable** (Option A) — just show the indicator, admins decide what to do
- **Empty = zero items in RSS response** — distinguish from "all items already seen" (normal dedup). Only increment the counter when the RSS feed itself returns zero items, not when all items are duplicates.

## Testing

- Unit test: consecutive empty crawl counter increments
- Unit test: counter resets on successful crawl with new items
- Unit test: `lastSuccessfulCrawlAt` updates only on success
- Unit test: stale threshold detection
