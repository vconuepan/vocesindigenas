# Migration Plan: Actually Relevant News Curation Platform

**Status:** Draft
**Created:** 2026-01-28
**Source:** WordPress plugin (RelevanceSpider) + Odin's Website (tech stack reference)

---

## 1. Requirements Restatement

Rebuild **actuallyrelevant.news** as a modern web application:

- **Frontend:** React + TypeScript + Tailwind CSS (Vite)
- **Backend:** Express + TypeScript + LangChain (OpenAI)
- **Database:** PostgreSQL with pgvector extension
- **Deployment:** Render.com (static site + web service + Postgres)

The system crawls news sources, evaluates article relevance to humanity using LLM analysis, and publishes curated content. It includes an admin dashboard for managing the editorial pipeline, and generates newsletters and podcast scripts.

The website also serves static pages (methodology, about, etc.) alongside the dynamic news content.

---

## 2. Project Structure

```
actually-relevant/
├── client/                  # React frontend (Vite + TypeScript + Tailwind)
│   ├── src/
│   │   ├── components/      # Shared UI components
│   │   ├── pages/           # Route pages (public + admin)
│   │   ├── layouts/         # Page layouts (public, admin)
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Utilities, API client, types
│   │   ├── routes.ts        # Route config with SEO metadata
│   │   └── App.tsx
│   ├── scripts/             # Build scripts (sitemap, images, og-image)
│   ├── public/
│   └── package.json
│
├── server/                  # Express backend (TypeScript)
│   ├── src/
│   │   ├── routes/          # API route handlers
│   │   ├── services/        # Business logic (crawling, analysis, LLM)
│   │   ├── models/          # Database models / Prisma client
│   │   ├── middleware/      # Auth, rate limiting, validation
│   │   ├── jobs/            # Scheduled tasks (crawling, assessment)
│   │   ├── prompts/         # LLM prompt templates
│   │   └── index.ts
│   ├── prisma/
│   │   └── schema.prisma    # Database schema
│   └── package.json
│
├── shared/                  # Shared types and constants
│   ├── types/               # TypeScript interfaces shared between client/server
│   └── constants/           # Shared enums, config values
│
├── .context/                # Context documentation for AI assistants
├── .plans/                  # Development planning documents
├── .to-migrate/             # Source material (existing projects)
├── backlog.md               # Future features and ideas
├── CLAUDE.md                # AI assistant development guidelines
└── README.md                # Project documentation
```

---

## 3. Database Schema (PostgreSQL + pgvector)

### Core Tables

**stories**
- `id` (uuid, PK)
- `url` (text, unique)
- `title` (text)
- `content` (text) — extracted article text
- `date_published` (timestamptz)
- `date_crawled` (timestamptz)
- `feed_id` (FK → feeds)
- `status` (enum: `fetched`, `pre_analyzed`, `analyzed`, `selected`, `published`, `rejected`, `trashed`)
- `relevance_rating_low` (integer, 1-10) — conservative rating
- `relevance_rating_high` (integer, 1-10) — speculative rating
- `emotion_tag` (enum: `uplifting`, `surprising`, `frustrating`, `scary`, `calm`)
- `ai_response` (jsonb) — full structured LLM output
- `ai_summary` (text)
- `ai_quote` (text)
- `ai_keywords` (text[])
- `ai_marketing_blurb` (text)
- `ai_relevance_reasons` (text)
- `ai_antifactors` (text)
- `ai_relevance_calculation` (text)
- `ai_scenarios` (text)
- `crawl_method` (text) — which extraction method succeeded
- `embedding` (vector(1536)) — pgvector, for future semantic search
- `created_at`, `updated_at` (timestamptz)

**feeds**
- `id` (uuid, PK)
- `title` (text)
- `url` (text, unique)
- `language` (text)
- `issue_id` (FK → issues)
- `active` (boolean, default true)
- `crawl_interval_hours` (integer, default 24)
- `last_crawled_at` (timestamptz)
- `html_selector` (text, nullable) — CSS selector for content extraction fallback
- `created_at`, `updated_at` (timestamptz)

**issues** (topics/categories)
- `id` (uuid, PK)
- `name` (text)
- `slug` (text, unique)
- `description` (text)
- `prompt_factors` (text) — what makes articles relevant for this topic
- `prompt_antifactors` (text) — what reduces relevance
- `prompt_ratings` (text) — rating scale definitions for this topic
- `created_at`, `updated_at` (timestamptz)

**newsletters**
- `id` (uuid, PK)
- `title` (text)
- `content` (text) — generated HTML content
- `story_ids` (uuid[]) — included stories
- `status` (enum: `draft`, `published`)
- `created_at`, `updated_at` (timestamptz)

**podcasts**
- `id` (uuid, PK)
- `title` (text)
- `script` (text) — generated podcast script
- `story_ids` (uuid[])
- `status` (enum: `draft`, `published`)
- `created_at`, `updated_at` (timestamptz)

**job_runs** (scheduling reliability)
- `id` (uuid, PK)
- `job_name` (text, unique) — e.g. `crawl_feeds`, `preassess_stories`, `assess_stories`, `select_stories`
- `last_started_at` (timestamptz)
- `last_completed_at` (timestamptz)
- `last_error` (text, nullable)
- `enabled` (boolean, default true)
- `cron_expression` (text) — e.g. `0 */6 * * *` (every 6 hours)
- `created_at`, `updated_at` (timestamptz)

### Future Tables (skeleton only in v1)

**users**
- `id` (uuid, PK)
- `email` (text, unique)
- `password_hash` (text)
- `role` (enum: `admin`, `editor`, `viewer`)
- `created_at`, `updated_at` (timestamptz)

---

## 4. Automated Pipeline Scheduling

The editorial pipeline runs automatically without manual intervention. We use **`node-cron`** inside the Express server process — no extra infrastructure, no Redis, no extra cost. Since the Render web service is always-on (paid tier required for Postgres anyway), in-process scheduling is reliable.

### How It Works

1. **`node-cron`** runs inside the Express server, triggered by cron expressions stored in the `job_runs` table
2. Each job checks `job_runs` to record start/completion/errors
3. On server restart, the scheduler reads all enabled jobs from `job_runs` and registers them with node-cron
4. If a run was missed (server was briefly down), the next startup detects overdue jobs and runs them immediately

### Default Pipeline Schedule

| Job | Default Schedule | What It Does |
|---|---|---|
| `crawl_feeds` | Every 6 hours (`0 */6 * * *`) | Crawls all feeds where `last_crawled_at + interval` has passed. Stores new stories as `fetched`. |
| `preassess_stories` | Every 6 hours, offset by 1h (`0 1,7,13,19 * * *`) | Batch pre-analysis of all `fetched` stories. Updates to `pre_analyzed`. |
| `assess_stories` | Twice daily (`0 9,21 * * *`) | Full analysis of `pre_analyzed` stories with rating >= threshold (e.g. 3+). Updates to `analyzed`. |
| `select_stories` | Daily (`0 10 * * *`) | LLM selects top stories from recent `analyzed` pool. Updates to `selected`. |

These are sensible defaults. The schedule is configurable per-job via the admin dashboard (Settings page) by editing the `cron_expression` and `enabled` fields in `job_runs`.

### Reliability Features

- **Overdue detection:** On startup, compare `last_completed_at + expected_interval` against current time. If overdue, run immediately.
- **Overlap prevention:** Each job checks if it's already running (via `last_started_at` without matching `last_completed_at`) and skips if so.
- **Error tracking:** `last_error` stores the failure reason. Failed jobs don't block the next scheduled run.
- **Manual trigger:** All jobs can also be triggered manually via admin API endpoints (`POST /api/admin/jobs/:jobName/run`).
- **Enable/disable:** Jobs can be toggled on/off from the admin dashboard without redeploying.

### Implementation Details

```
server/src/jobs/
├── scheduler.ts        # Initializes node-cron from job_runs table, handles startup catch-up
├── crawlFeeds.ts       # Crawl all due feeds
├── preassessStories.ts # Batch pre-analysis
├── assessStories.ts    # Full analysis of qualifying stories
└── selectStories.ts    # Publication selection
```

The scheduler initializes after the Express server starts and the database connection is ready. Each job file exports an async function that the scheduler wraps with start/complete/error tracking.

---

## 5. Migration Phases

### Phase 0: Project Scaffolding

Set up the monorepo structure with all tooling before writing any feature code.

**Tasks:**
1. Initialize `client/` with Vite + React 18 + TypeScript + Tailwind
2. Initialize `server/` with Express + TypeScript
3. Initialize `shared/` for shared types
4. Set up Prisma with PostgreSQL + pgvector extension
5. Port build scripts from odins-website:
   - `generate-sitemap.ts` (adapt routes for news site)
   - `images.mjs` (image optimization pipeline)
   - `generate-og-image.mjs`
6. Port infrastructure from odins-website:
   - Rate limiting middleware (`server/src/middleware/rateLimit.ts`)
   - CORS + Helmet security setup (`server/src/index.ts`)
   - Health check endpoint
   - Frontend-backend API communication pattern (`VITE_API_URL`)
7. Set up test infrastructure (Vitest + React Testing Library + supertest)
8. Create skeleton auth middleware (admin-only JWT or session-based, expandable later)
9. Adapt and copy over `.context/` files (images.md, accessibility.md, seo.md — update examples)
10. Create `CLAUDE.md` and `README.md` adapted for this project
11. Create `backlog.md` with deferred features

**What to carry over from odins-website:**
- `vite.config.ts` prerendering setup (for static pages AND published news pages)
- `client/src/test/setup.ts` test configuration
- `server/vitest.config.ts`
- `.env.sample` pattern
- npm script structure with `--prefix` convention

**What to change:**
- Remove odins-website-specific components (Quotation, personal page components)
- Remove personal data files (services.json, work-items.json, projects.json)
- Update all domain references from `odins.website` to `actuallyrelevant.news`
- Remove CSS utility classes tied to personal site; create new ones for news layout
- Keep generic CSS utilities (`.page-section`, `.page-title`, `.prose`)

---

### Phase 1: Database & Core Backend

Build the data layer and core API before any UI.

**Tasks:**
1. Write Prisma schema with all core tables (stories, feeds, issues, newsletters, podcasts)
2. Enable pgvector extension in migration
3. Create seed data (sample issues with prompt guidelines, sample feeds)
4. Build CRUD services and API routes:
   - `GET/POST/PUT/DELETE /api/admin/issues`
   - `GET/POST/PUT/DELETE /api/admin/feeds`
   - `GET/POST/PUT/DELETE /api/admin/stories` (with full filtering: status, issue, feed, date range, rating range, emotion tag, sort, pagination)
   - `GET /api/stories` (public endpoint — published stories only)
   - `GET /api/stories/:slug` (public — single story detail)
5. Implement admin auth middleware skeleton (hardcoded API key or simple JWT for now)
6. Write tests for all API routes

**Filtering system for stories** (migrated from RelevanceSpider):
- Status filter: `fetched | pre_analyzed | analyzed | selected | published | rejected | trashed`
- Issue filter (by issue ID)
- Feed filter (by feed ID)
- Date range (crawled after/before)
- Rating range (min/max for conservative rating)
- Emotion tag filter
- Sort: rating_asc, rating_desc, date_asc, date_desc, title_asc, title_desc, issue_asc, issue_desc
- Pagination: page + page_size
- Grouping: by issue or by feed (optional)

---

### Phase 2: Content Extraction Pipeline

Port the feed crawling and content extraction system.

**Tasks:**
1. Implement RSS feed parser
2. Implement content extraction with fallback chain:
   - **Method 1: CSS selector extraction** — Use Cheerio to extract content via feed-specific `html_selector`
   - **Method 2: Readability extraction** — Use Mozilla's Readability.js (@mozilla/readability + jsdom) for ML-based article extraction
   - **Method 3: External API fallback** — PipFeed API or equivalent paid service
3. Build crawling service:
   - `crawlFeed(feedId)` — fetch RSS, deduplicate URLs, extract content, store stories
   - `crawlAllDueFeeds()` — find feeds where `last_crawled_at + interval > now`
4. Implement automated scheduling system:
   - Set up `node-cron` scheduler that reads job config from `job_runs` table
   - Implement startup catch-up logic (detect and run overdue jobs)
   - Implement overlap prevention and error tracking
   - Create default job entries via seed data
5. Build API endpoints:
   - `POST /api/admin/feeds/:id/crawl` — manual crawl trigger
   - `POST /api/admin/feeds/crawl-all` — crawl all due feeds
   - `POST /api/admin/stories/crawl-url` — manual URL crawl
   - `POST /api/admin/jobs/:jobName/run` — manually trigger any scheduled job
   - `GET /api/admin/jobs` — list all jobs with status and last run info
   - `PUT /api/admin/jobs/:jobName` — update schedule or enable/disable
6. Write tests with mocked HTTP responses

**Node.js library recommendations for scraping:**
| PHP Library | Node.js Equivalent | Notes |
|---|---|---|
| PHP Goose | `@mozilla/readability` + `jsdom` | Mozilla's Readability is the gold standard for article extraction. Used by Firefox Reader View. |
| Simple HTML DOM | `cheerio` | jQuery-like API for server-side HTML parsing. Fast and well-maintained. |
| PHP Readability | (covered by @mozilla/readability) | Same purpose, better maintained. |
| Guzzle HTTP | `axios` or native `fetch` | Node 18+ has built-in fetch; axios adds interceptors and retry. |
| WordPress `fetch_feed` | `rss-parser` | Lightweight RSS/Atom parser. Well-maintained. |

---

### Phase 3: LLM Relevance Analysis

Port the AI analysis pipeline using LangChain with structured output.

**Tasks:**
1. Set up LangChain with OpenAI provider
2. Define Zod schemas for all LLM output structures:
   - `PreAssessmentResult` — { rating_low: number, emotion_tag: EmotionTag }
   - `FullAssessmentResult` — { publication_date, quote, keywords[], summary, factors[], antifactors[], relevance_calculation, conservative_rating, speculative_rating, scenarios, relevance_summary, marketing_blurb }
   - `PostSelectionResult` — { selected_ids: string[], reasoning: string }
   - `PodcastScript` — { script: string }
   - `NewsletterContent` — { html: string }
3. Port prompt templates from PHP to TypeScript template files:
   - Pre-assessment prompt (batch, lightweight)
   - Full assessment prompt (single article, detailed — ~500 lines of prompt engineering)
   - Post selection prompt (pairwise comparison)
   - Podcast generation prompt
   - Newsletter generation prompt
4. Implement token rate limiting (TPM throttling, matching current behavior)
5. Build analysis service with workflow methods:
   - `preAssessStories(storyIds[])` — batch pre-analysis, updates status to `pre_analyzed`
   - `assessStory(storyId)` — full analysis, updates status to `analyzed`
   - `selectForPublication(storyIds[])` — LLM selects top stories, updates to `selected`
   - `publishStories(storyIds[])` — marks as `published`
6. Build API endpoints:
   - `POST /api/admin/stories/preassess` — trigger pre-assessment for unrated stories
   - `POST /api/admin/stories/:id/assess` — trigger full assessment
   - `POST /api/admin/stories/select` — trigger publication selection
   - `POST /api/admin/stories/:id/publish` — manually publish
   - `POST /api/admin/stories/:id/reject` — manually reject
7. Write tests with mocked LLM responses

**Key migration note:** All LangChain calls use `.withStructuredOutput(zodSchema)` so we get validated, typed responses. This replaces the fragile regex parsing of the PHP version. The prompt templates must be carefully adapted to produce output matching the Zod schemas.

---

### Phase 4: Newsletter & Podcast Generation ✅ COMPLETED

**Tasks:**
1. Newsletter generation service:
   - Select published stories for inclusion
   - Generate newsletter HTML content via LangChain
   - Generate carousel images (use `sharp` or `@napi-rs/canvas` for image generation)
   - Generate PDF (use `pdfkit` or `puppeteer` for HTML-to-PDF)
   - Bundle as downloadable ZIP
2. Podcast script generation service:
   - Select published stories
   - Format story data as structured input
   - Generate podcast script via LangChain
   - Store script with metadata
3. API endpoints:
   - `POST /api/admin/newsletters/generate` — generate newsletter from recent published stories
   - `GET/PUT /api/admin/newsletters/:id` — view/edit newsletter
   - `POST /api/admin/podcasts/generate` — generate podcast script
   - `GET/PUT /api/admin/podcasts/:id` — view/edit podcast
4. Write tests

---

### Phase 5: Admin Dashboard (Frontend)

Build the management interface for the editorial pipeline.

**Tasks:**
1. Admin layout with navigation sidebar
2. **Dashboard page** — overview stats (stories by status, recent crawls, upcoming scheduled runs, job health/errors)
3. **Stories management page:**
   - Table/list view with all filter controls (status, issue, feed, date range, rating range, emotion tag)
   - Sort controls
   - Pagination
   - Bulk actions (preassess, assess, select, publish, reject, trash)
   - Individual story detail view showing:
     - Original article content
     - Full AI analysis results (factors, antifactors, ratings, scenarios, summary)
     - Edit capability for AI-generated fields
     - Status change controls
     - Link to original source
4. **Feeds management page:**
   - List of feeds with status, last crawled, story count
   - Add/edit/deactivate feeds
   - Manual crawl trigger
   - Assign feeds to issues
5. **Issues management page:**
   - List of topics/issues
   - Add/edit issues
   - Edit prompt guidelines (factors, antifactors, rating definitions)
6. **Newsletters page:**
   - List of generated newsletters
   - Generate new newsletter
   - Preview and edit
7. **Podcasts page:**
   - List of generated podcast scripts
   - Generate new script
   - Preview and edit
8. **Jobs/Scheduler page:**
   - List of scheduled jobs with status, last run time, next estimated run, errors
   - Enable/disable individual jobs
   - Edit cron expressions
   - Manual run trigger for each job
9. **Settings page:**
   - OpenAI API key configuration
   - LLM model selection
   - Token rate limits

---

### Phase 6: Public Website (Frontend)

Build the public-facing news site.

**Tasks:**
1. Public layout with header/footer/navigation
2. **Homepage** — featured/latest published stories, grouped by issue
3. **Story detail page** — article summary, relevance analysis, link to original source, related stories
4. **Issue/category pages** — stories filtered by topic
5. **Static pages** (content to be designed later):
   - Methodology page (how relevance is assessed)
   - About page
   - Contact page
6. SEO setup:
   - Pre-rendering for all static pages and published story pages
   - `react-helmet-async` for meta tags
   - Sitemap generation (static + dynamic routes for published stories)
   - robots.txt
   - Open Graph images
7. Responsive design (mobile-first)
8. Accessibility (WCAG 2.2 AA — carry over patterns from `.context/accessibility.md`)

---

### Phase 7: Deployment

**Tasks:**
1. Render.com setup:
   - **Static Site** — client build + dist
   - **Web Service** — server build + start
   - **PostgreSQL** — with pgvector extension enabled
2. Environment variables configuration
3. Database migrations (Prisma migrate)
4. CI/CD: auto-deploy on push to main
5. Custom domain setup for `actuallyrelevant.news`
6. Health monitoring

---

## 5. Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| **Prompt migration fidelity** — PHP prompts are ~500 lines of carefully tuned text | High | Extract to versioned template files; test with same articles and compare output quality side-by-side |
| **Content extraction differences** — Readability.js may extract differently than PHP Goose | Medium | Test with corpus of known articles; add manual content override field |
| **Image generation for newsletters** — GD → Canvas/Sharp has different rendering | Medium | Defer pixel-perfect matching; accept "good enough" initially |
| **Scheduled job reliability** — In-process node-cron dies if server restarts | Low | `job_runs` table tracks last completion; startup catch-up logic re-runs overdue jobs. Render paid tier has high uptime. |
| **pgvector availability on Render** — Must confirm Render Postgres supports pgvector | Low | Render supports pgvector on managed Postgres; verify at setup time |
| **OpenAI API costs during development** — Full assessments are token-heavy | Low | Use cheaper models for dev/test; mock LLM in automated tests |

---

## 6. Out of Scope (→ backlog.md)

- RSS feed output generation
- Public user accounts and personalization
- Semantic search over content (pgvector infrastructure prepared but search UI deferred)
- Email delivery for newsletters (generation only in v1)
- Audio generation for podcasts (script only in v1)
- Fully automated publishing (v1 selects stories automatically but a human reviews before final publish)
- Analytics and engagement tracking
- Social media auto-posting
- Multi-language support beyond content language tagging
- Profile embeddings / "find fellows" feature from RelevanceSpider

---

## 7. Files to Carry Over from .to-migrate

### From odins-website → project root/client/server

| Source | Destination | Changes Needed |
|---|---|---|
| `client/vite.config.ts` | `client/vite.config.ts` | Update prerender routes for news site |
| `client/scripts/generate-sitemap.ts` | `client/scripts/generate-sitemap.ts` | Update BASE_URL, add dynamic story routes |
| `client/scripts/images.mjs` | `client/scripts/images.mjs` | Minimal changes, update paths |
| `client/scripts/generate-og-image.mjs` | `client/scripts/generate-og-image.mjs` | Update branding/text for Actually Relevant |
| `client/src/routes.ts` | `client/src/routes.ts` | Replace routes entirely for news site |
| `client/src/test/setup.ts` | `client/src/test/setup.ts` | Minimal or no changes |
| `server/src/middleware/rateLimit.ts` | `server/src/middleware/rateLimit.ts` | Adjust limits for news API patterns |
| `server/src/index.ts` | `server/src/index.ts` | Keep CORS/Helmet/health; add new routes |
| `server/vitest.config.ts` | `server/vitest.config.ts` | Minimal changes |
| `server/.env.sample` | `server/.env.sample` | Add DATABASE_URL, update vars |

### From .context → .context

| Source | Destination | Changes Needed |
|---|---|---|
| `.context/images.md` | `.context/images.md` | Update examples from portfolio to news images |
| `.context/accessibility.md` | `.context/accessibility.md` | Update component references |
| `.context/seo.md` | `.context/seo.md` | Update domain, route priorities, add dynamic sitemap notes |

### From CLAUDE.md → CLAUDE.md

Keep and adapt:
- Project structure section (update for new layout)
- Tech stack section (add Prisma, PostgreSQL, LangChain)
- Commands section (add prisma commands, crawl commands)
- Tips for Claude section (keep --prefix convention)
- Deployment section (add Postgres service)
- SEO checklist
- Accessibility reference
- Context files reference

Remove:
- "Canonical Components" section (Quotation component, personal site components)
- "Writing Style" section (personal blog voice — replace with news editorial voice if needed)
- "Adding New Pages" section (replace with news-specific workflow)
- CSS utility classes specific to personal site

### From README.md → README.md

Keep and adapt:
- Tech stack overview (add database)
- Local development setup (add database setup, Prisma migrate)
- Deployment guide (add Postgres service on Render)
- Environment variables reference (add DATABASE_URL, expand)
- Troubleshooting section

Remove:
- All references to "Odin Mühlenbein" personal site
- Custom domain section specific to odins.website

### From RelevanceSpider → server/

| PHP Source | TypeScript Destination | Migration Approach |
|---|---|---|
| `models/chatgpt.php` | `server/src/services/llm.ts` + `server/src/prompts/*.ts` | Rewrite with LangChain structured output; port prompt templates verbatim then adapt for Zod schemas |
| `models/story.php` | `server/prisma/schema.prisma` + `server/src/services/story.ts` | Schema → Prisma model; query logic → Prisma queries with filters |
| `models/feed.php` | `server/src/services/feed.ts` + `server/src/services/crawler.ts` | Split content extraction into separate crawler service |
| `models/issue.php` | `server/prisma/schema.prisma` + `server/src/services/issue.ts` | Straightforward port; prompt section generation moves to prompts/ |
| `controllers/story_controller.php` | `server/src/routes/stories.ts` + `server/src/services/story.ts` | Split HTTP handling (routes) from business logic (services) |
| `controllers/feed_controller.php` | `server/src/routes/feeds.ts` + `server/src/services/feed.ts` | Same split pattern |
| `controllers/newsletter_controller.php` | `server/src/services/newsletter.ts` | Port generation logic; replace GD with Sharp/Canvas |
| `controllers/podcast_controller.php` | `server/src/services/podcast.ts` | Lightweight port; mostly prompt work |
| `custom_fields.php` | Prisma schema fields | Metadata becomes first-class database columns |
| `shortcodes/` | React components | WordPress shortcodes → React components for rendering story content |
