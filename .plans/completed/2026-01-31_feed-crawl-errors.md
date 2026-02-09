# Plan: Surface Feed Crawl Errors in Admin UI

## Goal

When feed crawling fails (RSS parse errors, extraction failures, etc.), persist the error on the Feed record and show it inline in the admin feed table so admins can see which feeds are broken and why — without checking server logs.

## Current State

- `crawler.ts` logs errors via Pino but discards error messages — `CrawlResult` only has a numeric `errors` count
- The Feed model has no error-related fields
- The admin feed table shows title, issue, language, interval, last crawled, and actions — no error indicator

## Changes

### 1. Database: Add error fields to Feed model

Add two columns to the `feeds` table:

```
lastCrawlError    String?   @map("last_crawl_error")
lastCrawlErrorAt  DateTime? @map("last_crawl_error_at")
```

- `lastCrawlError`: human-readable error summary (e.g. "RSS parse failed: 404 Not Found", "3 of 8 articles failed extraction")
- `lastCrawlErrorAt`: when the error occurred
- Both nullable — cleared on successful crawl (set to `null`)

**Files:** `server/prisma/schema.prisma`, new migration SQL

### 2. Backend: Capture and persist error messages

**`server/src/services/crawler.ts`:**
- Extend `CrawlResult` with `errorMessage?: string`
- In `crawlFeed()`: collect error messages (RSS parse failure, extraction failures) and build a summary string
- RSS parse failure → "RSS fetch failed: {error message}"
- Partial extraction failures → "N of M articles failed extraction"
- Full success → no error message

**`server/src/services/feed.ts`:**
- Add `updateCrawlStatus(id, error?)` function that:
  - On success: sets `lastCrawledAt = now`, clears `lastCrawlError` and `lastCrawlErrorAt` to `null`
  - On error: sets `lastCrawledAt = now`, `lastCrawlError = message`, `lastCrawlErrorAt = now`
- Replace current `updateLastCrawled()` calls with `updateCrawlStatus()`

### 3. Shared types

**`shared/types/index.ts`:**
- Add `lastCrawlError: string | null` and `lastCrawlErrorAt: string | null` to the `Feed` interface
- Add `errorMessage?: string` to `CrawlResult`

### 4. Frontend: Show errors inline in feed table

**`client/src/components/admin/FeedTable.tsx`:**
- When `feed.lastCrawlError` is non-null, show a warning icon (ExclamationTriangleIcon) next to the feed title
- Add a tooltip (title attribute or small popover) showing the error message and when it occurred
- Style: amber/yellow warning color to distinguish from normal state

### 5. Frontend: Show error in edit panel

**`client/src/components/admin/FeedEditPanel.tsx`:**
- If the feed has a `lastCrawlError`, show an alert/banner at the top of the edit panel with the error message and timestamp

## Migration

Single SQL migration adding two nullable columns — no data backfill needed, no breaking changes.

## Out of Scope

- Per-article error logging (decided against — single summary string is sufficient)
- Error history/timeline (only latest error stored)
- Auto-disabling feeds after repeated failures (possible future enhancement)
