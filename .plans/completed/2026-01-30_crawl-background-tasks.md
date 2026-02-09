# Plan: Background Task Toasts for Feed Crawl

## Summary

Convert the feed crawl actions (single feed + crawl all) from blocking mutations with simple success/error toasts to background tasks using the existing `useBackgroundTasks` pattern. This matches how pre-assessment and assessment already work in `StoriesPage.tsx`.

## Changes

### 1. Fix API return types (`client/src/lib/admin-api.ts`)

Update the `feeds.crawl` and `feeds.crawlAll` type declarations to match the actual server responses:

```ts
// Before
crawl: (id: string) => request<{ crawled: number }>(...)
crawlAll: () => request<{ crawled: number }>(...)

// After
crawl: (id: string) => request<CrawlResult>(...)
crawlAll: () => request<CrawlResult[]>(...)
```

Add `CrawlResult` type to `shared/types/index.ts` (matching `server/src/services/crawler.ts`):
```ts
export interface CrawlResult {
  feedId: string
  feedTitle: string
  newStories: number
  skipped: number
  errors: number
}
```

### 2. Update FeedsPage.tsx

Replace the current blocking mutation pattern with `useBackgroundTasks`:

**Single feed crawl:**
- Use `launchTask` with a single API call (no progress, like pre-assess pattern)
- Toast label: "Crawling {feedTitle}"
- On success: show "Crawling {feedTitle}: {newStories} new stories"
- `onComplete`: invalidate feeds query

**Crawl All:**
- Use `launchTask` with per-feed iteration and `reportProgress` (like the assess pattern)
- Fetch the feeds list, then iterate each feed calling `adminApi.feeds.crawl(id)`
- Toast label: "Crawling {n} feeds"
- Progress: "Crawling {n} feeds... 3/12"
- On success: aggregate results and show total new stories
- `onComplete`: invalidate feeds query

### 3. Update FeedTable props

Remove `crawlingId` prop since individual feed crawl state is no longer tracked via mutation — the background task handles it. The per-row crawl button will fire immediately without a loading spinner on the button itself (the progress is shown in the toast instead).

### 4. Remove unused hooks (`client/src/hooks/useFeeds.ts`)

Remove `useCrawlFeed` and `useCrawlAllFeeds` mutation hooks since they're replaced by direct `adminApi` calls inside the `launchTask` executor.

## Files Modified

| File | Change |
|------|--------|
| `shared/types/index.ts` | Add `CrawlResult` interface |
| `client/src/lib/admin-api.ts` | Fix return types for crawl/crawlAll |
| `client/src/pages/admin/FeedsPage.tsx` | Switch to `useBackgroundTasks` pattern |
| `client/src/components/admin/FeedTable.tsx` | Remove `crawlingId` prop |
| `client/src/hooks/useFeeds.ts` | Remove `useCrawlFeed` and `useCrawlAllFeeds` |

## Verification

1. `npm run build --prefix client` — no type errors
2. `npm run test --prefix client -- --run` — all tests pass
3. Manual test: click single feed Crawl button → blue progress toast appears → resolves to green/red
4. Manual test: click Crawl All → blue toast with progress counter → resolves with summary
