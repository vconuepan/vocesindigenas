# Feed Extraction Method Tracking

## Goal
Record which content extraction method succeeded for each story during crawling, and surface this info per-feed in the admin panel.

## Background

The extraction chain has 4 methods: `selector`, `readability`, `diffbot`, `pipfeed`. The `ExtractionResult.method` field tracks which one succeeded, but this is only logged — never persisted. A `Story.crawlMethod` column already exists in the database but is never populated.

## Plan

### 1. Populate `Story.crawlMethod` during crawl (no migration needed)

- **`server/src/services/story.ts`**: Add `crawlMethod` param to `createStory()`, pass it to `prisma.story.create()`.
- **`server/src/services/crawler.ts`**: Pass `extracted.method` to `createStory()` in both `crawlFeed()` and `crawlUrl()`.

### 2. Add extraction method breakdown to feed quality metrics

- **`server/src/services/feed.ts`**: In `getQualityMetrics()` (or as a separate query), add a grouped count of `crawlMethod` per feed. Returns something like `{ selector: 5, readability: 12, diffbot: 3 }` alongside existing publish-rate metrics.
- **Shared types**: Add `extractionMethods?: Record<string, number>` to `FeedQualityMetrics`.

### 3. Show in admin panel

- **`client/src/components/admin/FeedEditPanel.tsx`**: In the `QualityCard`, add an "Extraction Methods" row showing the method breakdown (e.g., "readability: 12, selector: 5, diffbot: 3").
- **`client/src/components/admin/FeedTable.tsx`**: Optionally show the dominant extraction method as a small badge/label on each feed row.

## Files to modify

| File | Change |
|------|--------|
| `server/src/services/story.ts` | Add `crawlMethod` to `createStory()` |
| `server/src/services/crawler.ts` | Pass `extracted.method` to `createStory()` |
| `server/src/services/feed.ts` | Add method counts to quality metrics query |
| `shared/types/index.ts` | Add `extractionMethods` to `FeedQualityMetrics` |
| `client/src/components/admin/FeedEditPanel.tsx` | Show method breakdown in QualityCard |
| `client/src/components/admin/FeedTable.tsx` | (Optional) Show dominant method badge |

## What this does NOT require

- **No database migration** — `Story.crawlMethod` column already exists
- **No new API endpoints** — piggybacks on existing `/api/admin/feeds/quality`

## Decisions

- **Display**: Both feed table (dominant method badge) and edit panel (full breakdown)
- **Backfill**: No — track going forward only. Existing stories stay `crawlMethod = null`.
