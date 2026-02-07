# Source (Feed) Quality Scoring

## Goal

Calculate and display quality metrics for each feed based on the stories it produces. Help admins identify high-value sources and underperforming ones.

## Current State

- Feeds track operational health: `consecutiveFailedCrawls`, `consecutiveEmptyCrawls`, `lastCrawlError`
- No quality metrics based on story outcomes
- Stories have `feedId`, `status`, `relevance`, `relevancePre`, `emotionTag`, `datePublished`
- Admin feed table shows: title, RSS URL, issue, crawl interval, last crawled, active status
- No aggregation of story data per feed

## Metrics to Calculate

### Core Metrics

| Metric | Formula | Description |
|--------|---------|-------------|
| **Publish rate** | `published / total_crawled` | % of crawled stories that reach publication |
| **Average relevance** | `AVG(relevance) WHERE status IN (analyzed, selected, published)` | Mean relevance score of analyzed stories |
| **Average pre-relevance** | `AVG(relevance_pre) WHERE relevance_pre IS NOT NULL` | Mean pre-screening score |
| **Published count** | `COUNT(*) WHERE status = 'published'` | Total published stories |
| **Total crawled** | `COUNT(*)` | Total stories ever crawled |
| **Recent activity** | `COUNT(*) WHERE date_crawled > NOW() - 30 days` | Stories in last 30 days |

### Derived Score

A single **quality score** (0-100) combining:
- Publish rate (40% weight) — the most meaningful signal
- Average relevance of published stories (40% weight) — quality of what gets through
- Recent activity (20% weight) — is the feed still producing?

```
qualityScore = (publishRate * 40) + (normalizedRelevance * 40) + (activityScore * 20)
```

Where:
- `publishRate` = `published / total` (0 to 1, scaled to 0-100)
- `normalizedRelevance` = `avgRelevance / 10 * 100` (relevance is 1-10, scale to 0-100)
- `activityScore` = `min(recentCount / 5, 1) * 100` (5+ recent stories = full score)

## Implementation

### 1. Query function

**File:** `server/src/services/feed.ts`

```typescript
interface FeedQualityMetrics {
  totalCrawled: number
  publishedCount: number
  rejectedCount: number
  publishRate: number        // 0-1
  avgRelevance: number | null
  avgPreRelevance: number | null
  recentCrawled: number      // last 30 days
  qualityScore: number       // 0-100
}

export async function getFeedQualityMetrics(feedId: string): Promise<FeedQualityMetrics>
export async function getAllFeedQualityMetrics(): Promise<Map<string, FeedQualityMetrics>>
```

The bulk version uses a single aggregation query:

```sql
SELECT
  f.id AS feed_id,
  COUNT(s.id) AS total_crawled,
  COUNT(s.id) FILTER (WHERE s.status = 'published') AS published_count,
  COUNT(s.id) FILTER (WHERE s.status = 'rejected') AS rejected_count,
  AVG(s.relevance) FILTER (WHERE s.relevance IS NOT NULL) AS avg_relevance,
  AVG(s.relevance_pre) FILTER (WHERE s.relevance_pre IS NOT NULL) AS avg_pre_relevance,
  COUNT(s.id) FILTER (WHERE s.date_crawled > NOW() - INTERVAL '30 days') AS recent_crawled
FROM feeds f
LEFT JOIN stories s ON s.feed_id = f.id
GROUP BY f.id
```

### 2. Admin API endpoint

**Endpoint:** `GET /api/admin/feeds/quality`

Returns quality metrics for all feeds in a single response. The admin feed table can fetch this alongside the feed list.

### 3. Admin UI — Feed Table Enhancement

Add columns to the feed table in `client/src/pages/admin/FeedsPage.tsx`:

| Column | Display |
|--------|---------|
| **Quality** | Score badge (0-100) with color: green (70+), yellow (40-69), red (<40) |
| **Publish %** | Percentage with small bar |
| **Avg Relevance** | Number (1-10) |
| **Published** | Count |
| **Total** | Count |

The quality score column should be sortable so admins can quickly find the best and worst feeds.

### 4. Feed detail panel enhancement

When viewing a single feed in the edit panel, show a quality metrics card:

```
Feed Quality
━━━━━━━━━━━━━━━━━━━━
Quality Score: 72/100  ████████░░
Publish Rate:  23%     ██░░░░░░░░
Avg Relevance: 6.8     ███████░░░

Published: 45 of 198 crawled
Last 30 days: 12 stories
```

### 5. Caching

Quality metrics are expensive to compute (aggregating across all stories). Cache the results:

- **Server-side cache:** 10-minute TTL in-memory cache for the bulk query
- **Client-side:** TanStack Query with `staleTime: 5 * 60 * 1000` (5 minutes)

## Configuration

Add to `server/src/config.ts`:
```typescript
feedQuality: {
  publishRateWeight: 40,
  relevanceWeight: 40,
  activityWeight: 20,
  recentDays: 30,
  activityThreshold: 5, // stories in recent period for full activity score
  cacheMinutes: 10,
}
```

## Files to Create/Modify

| File | Action |
|------|--------|
| `server/src/services/feed.ts` | Add quality metrics functions |
| `server/src/routes/admin/feeds.ts` | Add `/quality` endpoint |
| `server/src/config.ts` | Add `feedQuality` section |
| `client/src/pages/admin/FeedsPage.tsx` | Add quality columns + detail panel |
| `client/src/hooks/useFeeds.ts` | Add `useFeedQuality()` hook |

## Decisions

- **Time window:** All-time metrics (simpler, sufficient for current scale)
- **Visibility:** Admin-only (not shown on public site)
- **Minimum story count:** Apply minimum of 10 stories before showing a quality score (below that, show "insufficient data")
- **Staleness penalty:** Keep the activity component (20% weight) which naturally penalizes inactive feeds

## Estimated Scope

Small-medium — 1 SQL query, 1 new endpoint, UI enhancements to existing admin page. ~200 lines of code.
