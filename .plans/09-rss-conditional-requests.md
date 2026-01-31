# Plan: ETag/Last-Modified Support for RSS Fetching

## Goal

Avoid re-downloading unchanged RSS feeds by sending `If-None-Match` / `If-Modified-Since` headers and respecting `304 Not Modified` responses. Reduces bandwidth, server load on feed providers, and crawl time.

## Current State

- `server/src/services/rssParser.ts` uses the `rss-parser` library which calls `parseURL()` — a convenience method that fetches and parses in one step, with no support for custom request headers or 304 handling.
- The Feed model has no fields to store ETag or Last-Modified values.

## Changes

### 1. Database: Add caching fields to Feed model

```prisma
lastEtag         String?   @map("last_etag")
lastModified     String?   @map("last_modified")
```

**Files:** `server/prisma/schema.prisma`, new migration SQL

### 2. Backend: Split fetch and parse in rssParser.ts

Replace `parser.parseURL(url)` with:

1. Manual HTTP fetch using axios (already a project dependency) with conditional headers:
   - `If-None-Match: {feed.lastEtag}` (if stored)
   - `If-Modified-Since: {feed.lastModified}` (if stored)
2. On `304` response: return a sentinel (e.g., `null` or `{ notModified: true }`) to skip processing
3. On `200` response: parse the response body with `parser.parseString()`, extract `ETag` and `Last-Modified` from response headers
4. Wrap the HTTP call in `withRetry()` as before

**Files:** `server/src/services/rssParser.ts`

### 3. Backend: Pass caching headers through crawler

- `parseFeed()` signature changes to accept and return ETag/Last-Modified values
- `crawlFeed()` reads caching fields from the Feed record, passes them to `parseFeed()`, and persists returned values back to the Feed
- On `304 Not Modified`: skip all processing, update `lastCrawledAt`, log at debug level

**Files:** `server/src/services/crawler.ts`, `server/src/services/feed.ts`

### 4. Shared types

Add `lastEtag` and `lastModified` to the `Feed` type in shared types (optional, only if these fields need to be visible in the admin UI — likely not).

## Decision: Show `lastCrawlResult` summary in admin UI (Option B)

Add a `lastCrawlResult` field to Feed that stores a short summary like "304 not modified", "5 new articles", "RSS fetch failed: 404". This pairs with the feed-crawl-errors plan and gives admins a single-glance view of what happened on the last crawl. Use axios (already in the project).

## Testing

- Unit test: verify conditional headers are sent when ETag/Last-Modified are stored
- Unit test: verify 304 response skips processing
- Unit test: verify ETag/Last-Modified are persisted from response headers
- Unit test: verify normal 200 flow still works
