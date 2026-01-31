# Content Extraction

The crawler fetches RSS feeds and extracts article content using a 3-tier fallback chain. Each tier is tried in order; the first one that produces enough text wins.

## Extraction Chain

```
1. CSS Selector (feed-specific)
   ↓ fails or too short
2. Mozilla Readability (ML-based)
   ↓ fails
3. PipFeed API (external service)
```

### Tier 1: CSS Selector

If the feed has an `htmlSelector` configured (e.g., `article.post-content`), the extractor queries that selector on the fetched HTML. This is the most reliable method for feeds with consistent layouts.

**When to use**: Set `htmlSelector` on a feed when Readability fails or extracts too much noise (nav, sidebars, etc.).

**Minimum length**: Content must be at least `config.crawl.minContentLength` characters (default 50) to be accepted. If shorter, falls through to Readability. This threshold applies to all three extraction tiers.

### Tier 2: Mozilla Readability

Uses `@mozilla/readability` with `jsdom` to extract the main article content. Works well for standard news articles. This is the primary extraction method for most feeds.

### Tier 3: PipFeed API

External paid service fallback. Only used when Readability also fails. Requires `PIPFEED_API_KEY` environment variable. Skipped entirely if the key isn't set.

## Crawl Flow

```
RSS Feed → Parse items (max config.crawl.rssItemLimit, default 20)
         → Deduplicate against existing story URLs
         → For each new item (parallel, up to config.concurrency.crawlArticles):
            → Fetch page HTML (with retry, timeout config.crawl.httpTimeoutMs)
            → Extract content (3-tier chain)
            → Create story with status 'fetched'
         → Update feed's lastCrawledAt
```

Feeds are crawled in parallel (up to `config.concurrency.crawlFeeds`, default 5). Article extraction within each feed also runs in parallel (up to `config.concurrency.crawlArticles`, default 3). All HTTP requests (RSS parsing, page fetching, PipFeed API) use `withRetry()` from `server/src/lib/retry.ts` (3 attempts with exponential backoff).

### Deduplication

Before extracting any content, the crawler batch-checks all RSS item URLs against existing stories using `getExistingUrls()`. This avoids unnecessary HTTP requests and extraction work for already-crawled articles.

### Manual Crawling

- `POST /api/admin/stories/crawl-url` — crawl a single URL into a specific feed
- `POST /api/admin/feeds/:id/crawl` — trigger full RSS crawl for one feed
- `POST /api/admin/feeds/crawl-all` — crawl all feeds that are due

## Key Files

| File | Role |
|------|------|
| `server/src/services/crawler.ts` | Orchestration: RSS → deduplicate → extract → create stories |
| `server/src/services/extractor.ts` | 3-tier extraction chain |
| `server/src/services/rssParser.ts` | RSS/Atom feed parsing (max `config.crawl.rssItemLimit` items) |
| `server/src/lib/retry.ts` | Retry utility with exponential backoff (used by RSS parser, extractor) |
| `server/src/jobs/crawlFeeds.ts` | Scheduled job handler |

## Adding a New Feed

1. Create the feed via `POST /api/admin/feeds` with the RSS URL and issue ID
2. Test the crawl: `POST /api/admin/feeds/:id/crawl`
3. Check extracted content quality in the stories
4. If content is noisy or incomplete, set `htmlSelector` on the feed via `PUT /api/admin/feeds/:id`
