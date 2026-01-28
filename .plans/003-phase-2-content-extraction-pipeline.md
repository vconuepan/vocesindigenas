# Phase 2: Content Extraction Pipeline

**Status:** Ready for implementation
**Depends on:** Phase 1 (completed, commit `dc4985b`)
**Goal:** Crawl RSS feeds, extract article content, deduplicate, and store stories. Implement the scheduler so the pipeline runs automatically.

---

## Scope

- Install crawling dependencies (rss-parser, cheerio, @mozilla/readability, jsdom, axios)
- Implement RSS feed parsing
- Implement content extraction with 3-tier fallback chain
- Build crawling service (single feed, all due feeds, single URL)
- Implement node-cron scheduler with DB-driven config
- Build admin API endpoints for manual crawling and job management
- Write tests with mocked HTTP responses

**Out of scope:** LLM analysis (Phase 3), newsletter/podcast generation (Phase 4), frontend (Phase 5/6).

---

## Existing Code to Build On

| File | What's there | What Phase 2 adds |
|---|---|---|
| `server/src/jobs/scheduler.ts` | Skeleton with TODO comments | Full node-cron implementation |
| `server/src/index.ts` | Commented-out scheduler init | Uncomment scheduler call |
| `server/src/services/story.ts` | CRUD + filtering | `getStoryUrls()` for deduplication |
| `server/src/services/feed.ts` | CRUD | `getDueFeeds()` for crawl scheduling |
| `server/prisma/seed.ts` | 4 job runs (disabled) | No changes |

## PHP Reference Files

- `.to-migrate/models/feed.php` — RSS parsing, content extraction fallback chain, PipFeed API
- `.to-migrate/controllers/feed_controller.php` — Crawl workflow, deduplication, story creation
- `.to-migrate/controllers/api_controller.php` — Scheduler orchestration, manual trigger endpoints

---

## Implementation Steps

### Step 1: Install Dependencies

```bash
npm install rss-parser cheerio @mozilla/readability jsdom axios --prefix server
npm install -D @types/jsdom --prefix server
```

**Library mapping from PHP:**
| PHP Library | Node.js Replacement |
|---|---|
| WordPress `fetch_feed` (SimplePie) | `rss-parser` |
| Simple HTML DOM + Html2Text | `cheerio` (HTML→text extraction) |
| PHP Goose | `@mozilla/readability` + `jsdom` |
| Guzzle HTTP | `axios` (for PipFeed API + page fetching) |

---

### Step 2: Content Extraction Service

**File to create:** `server/src/services/extractor.ts`

Implements the 3-tier fallback chain from the PHP version:

**Method 1: CSS Selector Extraction** (`extractBySelector`)
- Fetch page HTML with axios
- Parse with cheerio
- Find content using feed's `htmlSelector` CSS selector
- Strip HTML tags, return plain text
- Skip if feed has no `htmlSelector` configured

**Method 2: Readability Extraction** (`extractByReadability`)
- Fetch page HTML with axios (if not already fetched)
- Parse with JSDOM
- Run `@mozilla/readability` Readability parser
- Return article title + textContent
- This is the primary extraction method for most articles

**Method 3: PipFeed API** (`extractByPipfeed`)
- POST to RapidAPI endpoint with article URL
- Requires `PIPFEED_API_KEY` env var
- Returns extracted text, title, date
- Skip if API key not configured (graceful degradation)

**Orchestrator method:** `extractContent(url, htmlSelector?)`
```typescript
export async function extractContent(
  url: string,
  options?: { htmlSelector?: string; language?: string }
): Promise<ExtractionResult | null>
```

Returns:
```typescript
interface ExtractionResult {
  title: string | null
  content: string
  datePublished: string | null
  method: 'selector' | 'readability' | 'pipfeed'
}
```

**HTTP fetching details:**
- User-Agent header identifying the bot
- Timeout: 10 seconds for page fetches, 15 seconds for PipFeed API
- Share the fetched HTML between selector and readability methods (don't fetch twice)

---

### Step 3: RSS Feed Parser Service

**File to create:** `server/src/services/rssParser.ts`

```typescript
import Parser from 'rss-parser'

interface RSSItem {
  url: string
  title: string
  datePublished: string | null
  description: string | null
}

export async function parseFeed(feedUrl: string): Promise<RSSItem[]>
```

- Parse RSS/Atom feed using `rss-parser`
- Normalize item fields (title, link→url, pubDate→datePublished, content/description)
- Return array of items, max 20 per fetch (matching PHP behavior)
- Handle parse errors gracefully (return empty array, log error)

---

### Step 4: Crawling Service

**File to create:** `server/src/services/crawler.ts`

**Methods:**

`crawlFeed(feedId: string): Promise<CrawlResult>`
1. Load feed from DB (including issue for htmlSelector)
2. Parse RSS feed via `parseFeed()`
3. Deduplicate: query existing story URLs, filter out already-crawled items
4. For each new item:
   - Extract content via `extractContent()` fallback chain
   - If extraction succeeds, create story record (status: `fetched`)
   - Record crawl method
5. Update feed's `lastCrawledAt` timestamp
6. Return `{ newStories: number, errors: number, feedTitle: string }`

`crawlAllDueFeeds(): Promise<CrawlResult[]>`
1. Query feeds where: `active = true` AND (`lastCrawledAt IS NULL` OR `lastCrawledAt + crawlIntervalHours < now`)
2. Crawl each feed sequentially (polite — no parallel crawling)
3. Return results array

`crawlUrl(url: string, feedId: string): Promise<Story | null>`
1. Check URL not already crawled
2. Extract content
3. Create story record
4. Return created story or null

**Add to feed service** (`server/src/services/feed.ts`):
```typescript
export async function getDueFeeds(): Promise<Feed[]>
```
Queries feeds where active AND (never crawled OR interval elapsed).

**Add to story service** (`server/src/services/story.ts`):
```typescript
export async function getExistingUrls(urls: string[]): Promise<Set<string>>
```
Batch URL lookup for deduplication.

---

### Step 5: Scheduler Implementation

**File to modify:** `server/src/jobs/scheduler.ts`

Full implementation:

```typescript
import cron from 'node-cron'
import prisma from '../lib/prisma.js'

interface RegisteredJob {
  task: cron.ScheduledTask
  jobName: string
}

const registeredJobs: RegisteredJob[] = []

export async function initScheduler(): Promise<void> {
  // 1. Read all job_runs from DB
  // 2. For each enabled job, register with node-cron
  // 3. Check for overdue jobs and run immediately
}

async function runJob(jobName: string): Promise<void> {
  // 1. Check not already running (overlap prevention)
  // 2. Update last_started_at
  // 3. Call job handler
  // 4. Update last_completed_at
  // 5. On error: update last_error
}
```

**Job handler registry:**
```typescript
const JOB_HANDLERS: Record<string, () => Promise<void>> = {
  crawl_feeds: async () => { /* calls crawlAllDueFeeds */ },
  preassess_stories: async () => { /* Phase 3 — no-op for now */ },
  assess_stories: async () => { /* Phase 3 — no-op for now */ },
  select_stories: async () => { /* Phase 3 — no-op for now */ },
}
```

**Overdue detection on startup:**
- For each enabled job: compare `lastCompletedAt` + cron interval against now
- If overdue, trigger immediately
- Use `cron-parser` npm package (already a dep of `node-cron`) to calculate next expected run

**Overlap prevention:**
- Check if `lastStartedAt > lastCompletedAt` (job still running)
- Skip if already running, log a warning

---

### Step 6: Job Files

**Files to create:**
- `server/src/jobs/crawlFeeds.ts` — Calls `crawlAllDueFeeds()`, logs results
- `server/src/jobs/preassessStories.ts` — Placeholder (Phase 3)
- `server/src/jobs/assessStories.ts` — Placeholder (Phase 3)
- `server/src/jobs/selectStories.ts` — Placeholder (Phase 3)

Each file exports a single async function:
```typescript
export async function runCrawlFeeds(): Promise<void> {
  const results = await crawlAllDueFeeds()
  for (const r of results) {
    console.log(`[crawl_feeds] ${r.feedTitle}: ${r.newStories} new, ${r.errors} errors`)
  }
}
```

---

### Step 7: Admin API Endpoints

**File to create:** `server/src/routes/admin/jobs.ts`

| Method | Path | Handler |
|---|---|---|
| GET | `/api/admin/jobs` | List all jobs with status and last run info |
| PUT | `/api/admin/jobs/:jobName` | Update cron expression or enable/disable |
| POST | `/api/admin/jobs/:jobName/run` | Manually trigger a job |

**Add to existing routes:**

`server/src/routes/admin/feeds.ts` — add:
| Method | Path | Handler |
|---|---|---|
| POST | `/api/admin/feeds/:id/crawl` | Crawl a specific feed |
| POST | `/api/admin/feeds/crawl-all` | Crawl all due feeds |

`server/src/routes/admin/stories.ts` — add:
| Method | Path | Handler |
|---|---|---|
| POST | `/api/admin/stories/crawl-url` | Crawl a single URL into a feed |

**Zod schemas to add:** `server/src/schemas/job.ts`
- Update job: `cronExpression` (valid cron string), `enabled` (boolean)
- Crawl URL: `url` (valid URL), `feedId` (UUID)

**Wire jobs router:** Add `router.use('/jobs', jobRouter)` in `server/src/routes/admin/index.ts`

---

### Step 8: Activate Scheduler in Server

**Modify:** `server/src/index.ts`
- Uncomment the scheduler initialization
- Import scheduler after app starts listening

```typescript
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  import('./jobs/scheduler.js').then(m => m.initScheduler())
})
```

---

### Step 9: Tests

**Files to create:**
- `server/src/services/extractor.test.ts` — Test all 3 extraction methods with mocked HTTP
- `server/src/services/rssParser.test.ts` — Test RSS parsing with sample XML
- `server/src/services/crawler.test.ts` — Test crawl workflow, deduplication, error handling
- `server/src/jobs/scheduler.test.ts` — Test job registration, overdue detection, overlap prevention
- `server/src/routes/admin/jobs.test.ts` — Test job management API endpoints

**Test approach:**
- Mock `axios` for all HTTP calls (no real network requests)
- Use sample RSS XML and HTML fixtures
- Mock Prisma client (same pattern as Phase 1 tests)
- Test extraction fallback: selector fails → readability succeeds
- Test dedup: URLs already in DB are skipped
- Test scheduler: overdue jobs run on init, running jobs aren't re-triggered

---

## File Summary

**New files (11):**
```
server/src/services/extractor.ts       # Content extraction (3-tier fallback)
server/src/services/rssParser.ts       # RSS/Atom feed parser
server/src/services/crawler.ts         # Crawl orchestration
server/src/jobs/crawlFeeds.ts          # Crawl feeds job handler
server/src/jobs/preassessStories.ts    # Placeholder (Phase 3)
server/src/jobs/assessStories.ts       # Placeholder (Phase 3)
server/src/jobs/selectStories.ts       # Placeholder (Phase 3)
server/src/routes/admin/jobs.ts        # Job management endpoints
server/src/schemas/job.ts              # Job Zod schemas
server/src/services/extractor.test.ts
server/src/services/rssParser.test.ts
server/src/services/crawler.test.ts
server/src/jobs/scheduler.test.ts
server/src/routes/admin/jobs.test.ts
```

**Modified files (6):**
```
server/package.json                    # Add rss-parser, cheerio, readability, jsdom, axios
server/src/index.ts                    # Activate scheduler
server/src/jobs/scheduler.ts           # Full implementation
server/src/services/feed.ts            # Add getDueFeeds()
server/src/services/story.ts           # Add getExistingUrls()
server/src/routes/admin/index.ts       # Mount jobs router
server/src/routes/admin/feeds.ts       # Add crawl endpoints
server/src/routes/admin/stories.ts     # Add crawl-url endpoint
```

---

## Environment Variables

Add to `.env.sample` and `.env`:
```
PIPFEED_API_KEY=           # Optional — RapidAPI key for PipFeed fallback extraction
```

The PipFeed integration is optional. If the key is not set, the extractor skips the third fallback tier and logs a warning.

---

## Verification

1. `npm run build --prefix server` — compiles clean
2. `npm run test --prefix server` — all tests pass
3. Manual smoke test:
   ```bash
   # Start server
   npm run dev --prefix server

   # Crawl a specific feed
   curl -X POST -H "Authorization: Bearer $ADMIN_API_KEY" \
     http://localhost:3001/api/admin/feeds/<feed-id>/crawl

   # Check new stories appeared
   curl -H "Authorization: Bearer $ADMIN_API_KEY" \
     "http://localhost:3001/api/admin/stories?status=fetched"

   # List jobs
   curl -H "Authorization: Bearer $ADMIN_API_KEY" \
     http://localhost:3001/api/admin/jobs
   ```
