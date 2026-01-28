# Phase 1: Database & Core Backend API

**Status:** Implemented (code complete, tests passing — migration + seed require running PostgreSQL)
**Depends on:** Phase 0 (completed, commit `3ca26fe`)
**Goal:** Build the data layer and full CRUD API so later phases have a working backend to wire into.

---

## Scope

- Run Prisma migrations to create the database
- Seed the database with sample issues and feeds
- Build service layer (business logic) for Issues, Feeds, and Stories
- Build admin API routes (CRUD, filtering, pagination, bulk actions)
- Build public API routes (published stories, story detail)
- Write tests for all routes using supertest + vitest
- Prisma schema is already written — no schema changes needed

**Out of scope:** Crawling, LLM analysis, scheduler, newsletter/podcast generation, frontend.

---

## Existing Code to Build On

All files below already exist from Phase 0:

| File | What's there | What Phase 1 adds |
|---|---|---|
| `server/prisma/schema.prisma` | Full schema (7 models, 4 enums) | First migration |
| `server/src/index.ts` | Express setup, CORS, Helmet, route mounting | Prisma client initialization |
| `server/src/routes/admin/index.ts` | Auth middleware applied, placeholder `/status` | CRUD route handlers |
| `server/src/routes/public/index.ts` | Rate limiter applied, placeholder `/stories` | Query endpoints |
| `server/src/middleware/auth.ts` | API key auth (`Bearer` header) | No changes |
| `server/src/middleware/rateLimit.ts` | Two limiters (general + expensive) | No changes |
| `server/src/services/` | Empty directory | Service classes |
| `server/src/models/` | Empty directory | Not used — Prisma client is the data layer |
| `shared/types/index.ts` | All API types, filter types, `PaginatedResponse<T>` | No changes |
| `shared/constants/index.ts` | Status/tag arrays, page size defaults | No changes |

---

## Implementation Steps

### Step 1: Prisma Client & Database Setup

**Files to create/modify:**
- `server/src/lib/prisma.ts` — singleton Prisma client instance
- `server/src/index.ts` — import Prisma client, add graceful shutdown

`server/src/lib/prisma.ts`:
```typescript
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
export default prisma
```

Modify `server/src/index.ts` to add shutdown:
```typescript
import prisma from './lib/prisma.js'

// ... existing setup ...

process.on('SIGTERM', async () => {
  await prisma.$disconnect()
  process.exit(0)
})
```

**Commands to run:**
```bash
# Create first migration (requires DATABASE_URL in .env)
npm run db:migrate --prefix server
# Generate Prisma client
npm run db:generate --prefix server
```

---

### Step 2: Seed Data

**File to create:** `server/prisma/seed.ts`

Create 3-4 sample issues with realistic prompt guidelines, and 2-3 sample feeds per issue. Also create default job_run entries for the 4 scheduled jobs.

Sample issues:
- **AI & Technology** — slug: `ai-technology`
- **Climate & Environment** — slug: `climate-environment`
- **Global Health** — slug: `global-health`
- **Society & Governance** — slug: `society-governance`

Each issue needs `promptFactors`, `promptAntifactors`, and `promptRatings` text. These can be placeholder text for now — the real prompt guidelines will be ported from the PHP reference files in Phase 3.

Sample feeds (1-2 per issue, using real RSS feed URLs):
- AI: Ars Technica AI, MIT Technology Review
- Climate: Carbon Brief, Guardian Environment
- Health: WHO News, STAT News
- Governance: The Conversation, Foreign Affairs

Default job runs (all disabled, to be enabled in Phase 2):
- `crawl_feeds` — `0 */6 * * *`
- `preassess_stories` — `0 1,7,13,19 * * *`
- `assess_stories` — `0 9,21 * * *`
- `select_stories` — `0 10 * * *`

**Add to `server/package.json`** in prisma section:
```json
"prisma": {
  "seed": "tsx prisma/seed.ts"
}
```

---

### Step 3: Issue Service & Routes

**Files to create:**
- `server/src/services/issue.ts` — Issue CRUD
- `server/src/routes/admin/issues.ts` — Admin issue endpoints

**Service methods:**
- `getAllIssues()` — returns all issues ordered by name
- `getIssueById(id)` — single issue
- `getIssueBySlug(slug)` — single issue by slug
- `createIssue(data)` — create with validation
- `updateIssue(id, data)` — partial update
- `deleteIssue(id)` — delete (fail if feeds reference it)

**Admin routes:**
| Method | Path | Handler |
|---|---|---|
| GET | `/api/admin/issues` | List all issues |
| GET | `/api/admin/issues/:id` | Get single issue |
| POST | `/api/admin/issues` | Create issue |
| PUT | `/api/admin/issues/:id` | Update issue |
| DELETE | `/api/admin/issues/:id` | Delete issue |

**Validation (Zod schemas):**
- Create: `name` (required), `slug` (required, lowercase, hyphenated), `description`, `promptFactors`, `promptAntifactors`, `promptRatings`
- Update: all fields optional

**File to create:** `server/src/schemas/issue.ts` — Zod schemas for request validation

---

### Step 4: Feed Service & Routes

**Files to create:**
- `server/src/services/feed.ts` — Feed CRUD
- `server/src/routes/admin/feeds.ts` — Admin feed endpoints

**Service methods:**
- `getFeeds(filters?)` — list feeds, optionally filtered by issueId, active status
- `getFeedById(id)` — single feed with issue data
- `createFeed(data)` — create, validate issueId exists
- `updateFeed(id, data)` — partial update
- `deleteFeed(id)` — delete (fail if stories reference it)
- `toggleFeedActive(id, active)` — activate/deactivate

**Admin routes:**
| Method | Path | Handler |
|---|---|---|
| GET | `/api/admin/feeds` | List feeds (with optional `?issueId=&active=` filters) |
| GET | `/api/admin/feeds/:id` | Get single feed (include issue) |
| POST | `/api/admin/feeds` | Create feed |
| PUT | `/api/admin/feeds/:id` | Update feed |
| DELETE | `/api/admin/feeds/:id` | Delete feed |

**Validation (Zod schemas):**
- Create: `title` (required), `url` (required, valid URL), `language` (default "en"), `issueId` (required, must exist), `crawlIntervalHours` (optional, default 24), `htmlSelector` (optional)
- Update: all fields optional

**File to create:** `server/src/schemas/feed.ts`

---

### Step 5: Story Service & Routes (Admin)

This is the most complex service — full filtering, sorting, pagination, and bulk status transitions.

**Files to create:**
- `server/src/services/story.ts` — Story CRUD + filtering
- `server/src/routes/admin/stories.ts` — Admin story endpoints

**Service methods:**
- `getStories(filters: StoryFilters)` — paginated, filtered, sorted query (see filter spec below)
- `getStoryById(id)` — single story with feed and issue data
- `createStory(data)` — manual story creation (used by crawlers in Phase 2)
- `updateStory(id, data)` — partial update (edit AI fields, status, etc.)
- `updateStoryStatus(id, status)` — status change with validation (only valid transitions)
- `bulkUpdateStatus(ids[], status)` — bulk status change
- `deleteStory(id)` — hard delete (or set status to `trashed`)
- `getStoryStats()` — count of stories per status (for admin dashboard)

**Filtering spec** (from `StoryFilters` type in `shared/types/index.ts`):

```
GET /api/admin/stories?status=fetched&issueId=...&feedId=...&crawledAfter=2024-01-01&crawledBefore=2024-12-31&ratingMin=3&ratingMax=10&emotionTag=uplifting&sort=rating_desc&page=1&pageSize=25
```

Prisma `where` clause construction:
- `status` → exact match
- `issueId` → join through feed: `{ feed: { issueId } }`
- `feedId` → exact match on `feedId`
- `crawledAfter` / `crawledBefore` → `dateCrawled: { gte, lte }`
- `ratingMin` / `ratingMax` → `relevanceRatingLow: { gte, lte }`
- `emotionTag` → exact match
- `sort` → Prisma `orderBy` mapping:
  - `rating_asc` → `{ relevanceRatingLow: 'asc' }`
  - `rating_desc` → `{ relevanceRatingLow: 'desc' }`
  - `date_asc` → `{ dateCrawled: 'asc' }`
  - `date_desc` → `{ dateCrawled: 'desc' }`
  - `title_asc` → `{ title: 'asc' }`
  - `title_desc` → `{ title: 'desc' }`
- Default sort: `{ dateCrawled: 'desc' }`
- Pagination: `skip: (page - 1) * pageSize`, `take: pageSize`

**Admin routes:**
| Method | Path | Handler |
|---|---|---|
| GET | `/api/admin/stories` | List stories (filtered, sorted, paginated) |
| GET | `/api/admin/stories/stats` | Story counts per status |
| GET | `/api/admin/stories/:id` | Get single story (include feed + issue) |
| POST | `/api/admin/stories` | Create story manually |
| PUT | `/api/admin/stories/:id` | Update story |
| PUT | `/api/admin/stories/:id/status` | Change story status |
| POST | `/api/admin/stories/bulk-status` | Bulk status change `{ ids[], status }` |
| DELETE | `/api/admin/stories/:id` | Delete story |

**Validation (Zod schemas):**
- Create: `url` (required, valid URL), `title` (required), `content` (required), `feedId` (required, must exist), `datePublished` (optional ISO date)
- Update: all fields optional
- Status change: `status` must be valid `StoryStatus`
- Bulk status: `ids` (non-empty string array), `status` (valid `StoryStatus`)
- Query params: all optional, with type coercion (string → number for ratings/page)

**File to create:** `server/src/schemas/story.ts`

---

### Step 6: Public Story Routes

**File to create:** `server/src/routes/public/stories.ts`

**Service method additions to `story.ts`:**
- `getPublishedStories(page, pageSize)` — only `status: 'published'`, sorted by `dateCrawled desc`, includes feed + issue
- `getPublishedStoryById(id)` — single published story with all details

**Public routes:**
| Method | Path | Handler |
|---|---|---|
| GET | `/api/stories` | Published stories (paginated, optional `?issueSlug=` filter) |
| GET | `/api/stories/:id` | Single published story detail |

These return a subset of story fields — no internal AI fields like `aiResponse`, `aiRelevanceCalculation`. Only public-facing fields: `id`, `url`, `title`, `datePublished`, `dateCrawled`, `status`, `relevanceRatingLow`, `relevanceRatingHigh`, `emotionTag`, `aiSummary`, `aiQuote`, `aiKeywords`, `aiMarketingBlurb`, `aiRelevanceReasons`, `aiAntifactors`, `aiScenarios`, plus `feed.title` and `issue.name`/`issue.slug`.

---

### Step 7: Wire Routes into Server

**Modify:** `server/src/routes/admin/index.ts`
- Import and mount issue, feed, story routers
- Remove placeholder `/status` endpoint

**Modify:** `server/src/routes/public/index.ts`
- Import and mount public stories router
- Remove placeholder `/stories` endpoint

---

### Step 8: Tests

**Files to create:**
- `server/src/routes/admin/issues.test.ts`
- `server/src/routes/admin/feeds.test.ts`
- `server/src/routes/admin/stories.test.ts`
- `server/src/routes/public/stories.test.ts`

**Test approach:**
- Use supertest against the Express app
- Use a test database (separate `DATABASE_URL` for test env, or use Prisma's test utilities)
- Before each test suite: clean the database, seed minimal data
- Test auth: requests without/with invalid/with valid `Authorization` header
- Test CRUD: create, read, update, delete for each entity
- Test story filtering: multiple filter combinations, sort orders, pagination
- Test validation: missing required fields, invalid types, invalid references
- Test public endpoints: only published stories returned, correct field subset

**Test helper to create:** `server/src/test/helpers.ts`
- `createTestApp()` — returns the Express app for supertest
- `cleanDatabase()` — truncates all tables in correct order (respecting foreign keys)
- `seedTestData()` — creates minimal issue + feed + story set for testing
- `authHeader()` — returns valid admin auth header

---

### Step 9: Validation Middleware

**File to create:** `server/src/middleware/validate.ts`

Generic Zod validation middleware:
```typescript
import { ZodSchema } from 'zod'
import type { Request, Response, NextFunction } from 'express'

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      res.status(400).json({ error: 'Validation failed', details: result.error.flatten() })
      return
    }
    req.body = result.data
    next()
  }
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query)
    if (!result.success) {
      res.status(400).json({ error: 'Invalid query parameters', details: result.error.flatten() })
      return
    }
    // Attach parsed/coerced query params
    ;(req as any).parsedQuery = result.data
    next()
  }
}
```

---

## File Summary

**New files (16):**
```
server/src/lib/prisma.ts              # Prisma client singleton
server/src/middleware/validate.ts      # Zod validation middleware
server/src/schemas/issue.ts           # Issue Zod schemas
server/src/schemas/feed.ts            # Feed Zod schemas
server/src/schemas/story.ts           # Story Zod schemas (includes query filter schema)
server/src/services/issue.ts          # Issue CRUD service
server/src/services/feed.ts           # Feed CRUD service
server/src/services/story.ts          # Story CRUD + filtering service
server/src/routes/admin/issues.ts     # Admin issue endpoints
server/src/routes/admin/feeds.ts      # Admin feed endpoints
server/src/routes/admin/stories.ts    # Admin story endpoints
server/src/routes/public/stories.ts   # Public story endpoints
server/src/test/helpers.ts            # Test utilities
server/src/routes/admin/issues.test.ts
server/src/routes/admin/feeds.test.ts
server/src/routes/admin/stories.test.ts
server/src/routes/public/stories.test.ts
server/prisma/seed.ts                 # Seed data
```

**Modified files (4):**
```
server/src/index.ts                   # Add Prisma import + shutdown
server/src/routes/admin/index.ts      # Mount CRUD routers
server/src/routes/public/index.ts     # Mount public router
server/package.json                   # Add prisma.seed config
```

---

## Verification

1. `npm run db:migrate --prefix server` — migration runs successfully
2. `npm run db:seed --prefix server` — seed data inserted
3. `npm run build --prefix server` — TypeScript compiles clean
4. `npm run test --prefix server` — all tests pass
5. Manual smoke test with curl:
   ```bash
   # Health check
   curl http://localhost:3001/health

   # Admin: list issues (with auth)
   curl -H "Authorization: Bearer $ADMIN_API_KEY" http://localhost:3001/api/admin/issues

   # Admin: list stories with filters
   curl -H "Authorization: Bearer $ADMIN_API_KEY" "http://localhost:3001/api/admin/stories?status=fetched&page=1&pageSize=10"

   # Public: published stories
   curl http://localhost:3001/api/stories
   ```
