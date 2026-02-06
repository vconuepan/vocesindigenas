# Plan: Optimize Feed Interval Eligibility Check in getDueFeeds()

## Decision: Keep JS filter, optimize the coarse DB filter (Option B)

## Goal

`getDueFeeds()` currently fetches all active feeds from the database with a coarse 1-hour filter, then applies the per-feed `crawlIntervalHours` check in JavaScript. Tighten the SQL filter to reduce data transfer while keeping the JS filter for exact per-feed interval logic.

## Current State

`server/src/services/feed.ts` (lines 61-83):

1. Prisma query fetches all active feeds where `lastCrawledAt` is null OR at least 1 hour ago (coarse filter)
2. `.then(feeds => feeds.filter(...))` applies the per-feed `crawlIntervalHours` check in JS

The coarse filter uses a hardcoded 1-hour minimum, which means all feeds crawled more than 1 hour ago are fetched even if their interval is 24 hours.

## Changes

### 1. Tighten the coarse DB filter

**`server/src/services/feed.ts`:**

Instead of the hardcoded 1-hour minimum, use the smallest `crawlIntervalHours` value across active feeds as the coarse filter. Or simpler: use the feed's own interval in a raw WHERE clause.

Since Prisma can't reference a column in a date comparison, the best approach within Prisma is:

- Query with the current coarse filter (keeps Prisma, avoids raw SQL)
- But improve the coarse threshold: instead of 1 hour, use the minimum crawl interval from config (which is effectively the smallest useful interval)

Alternatively, use `prisma.$queryRaw` just for the WHERE clause while keeping Prisma's include/mapping:

```typescript
const dueFeeds = await prisma.$queryRaw<{ id: string }[]>`
  SELECT id FROM feeds
  WHERE active = true
  AND (last_crawled_at IS NULL
    OR last_crawled_at + (crawl_interval_hours || ' hours')::interval < NOW())
`
const ids = dueFeeds.map(f => f.id)
return prisma.feed.findMany({
  where: { id: { in: ids } },
  include: { issue: true },
})
```

This gives us SQL-level filtering with Prisma-level result mapping — a hybrid approach that avoids manual column mapping.

### 2. Add database index

Create a partial index to support the query:

```sql
CREATE INDEX idx_feeds_active_crawl ON feeds (last_crawled_at)
WHERE active = true;
```

**Files:**
- `server/src/services/feed.ts` — rewrite `getDueFeeds()`
- `server/prisma/schema.prisma` — add index annotation
- New migration SQL

## Testing

- Unit test: verify only feeds past their interval are returned
- Unit test: verify never-crawled feeds (null lastCrawledAt) are returned
- Unit test: verify inactive feeds are excluded
