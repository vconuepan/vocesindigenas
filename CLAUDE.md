# Actually Relevant

AI-curated news platform that evaluates article relevance to humanity using LLM analysis. Crawls news sources, assesses relevance, and publishes curated content.

## Implementation Workflow

**IMPORTANT**: Unless specified otherwise, follow the process outlined in the `/workflow` skill.

## Project Structure

```
actually-relevant/
├── client/          # React frontend (Vite + TypeScript + Tailwind)
├── server/          # Express backend (Prisma + LangChain + OpenAI)
├── shared/          # Shared types and constants
├── .context/        # Context documentation
├── .plans/          # Active development plans
│   └── completed/   # Archive of all past plans (70+ files)
├── BACKLOG.md       # Deferred features
├── CLAUDE.md        # This file
└── README.md        # Project documentation
```

## Tech Stack

**Frontend:**

- **Framework:** Vite + React 18 + TypeScript
- **Styling:** Tailwind CSS
- **SEO:** react-helmet-async + @prerenderer for static HTML generation
- **Testing:** Vitest + React Testing Library

**Backend:**

- **Framework:** Express + TypeScript
- **Database:** PostgreSQL + pgvector (Prisma ORM)
- **AI:** LangChain + OpenAI (structured output with Zod)
- **Scheduling:** node-cron (in-process)
- **Validation:** Zod

**Deployment:** Render.com (static site + web service + PostgreSQL)

## Commands

### Frontend (client/)

```bash
npm run dev      # Start dev server
npm run build    # Build for production (includes prerendering)
npm run preview  # Preview production build
npm run test     # Run tests
npm run test:watch  # Run tests in watch mode

# Image optimization (see .context/images.md)
npm run images:info      # List all images and their variants
npm run images:optimize  # Generate optimized WebP variants
npm run images:og        # Generate og-image.png for social sharing
```

### Backend (server/)

```bash
npm run dev        # Start dev server with hot reload
npm run build      # Build TypeScript to dist/
npm start          # Run production build
npm run test       # Run tests
npm run test:watch # Run tests in watch mode

# Database
npm run db:migrate   # Run Prisma migrations
npm run db:generate  # Generate Prisma client
npm run db:studio    # Open Prisma Studio (DB browser)
npm run db:seed      # Seed database with sample data
```

**Tips for Claude:**

- **`.env` files are not accessible** — Claude cannot read `.env` files (they are in `.gitignore`). Do not attempt to read or access them. Database commands that need env vars must be run via npm scripts defined in `package.json`, which load `.env` automatically.

- **Database migrations — MUST follow `.context/database-migrations.md`** — Never run `prisma migrate dev` or `npm run db:migrate` directly. Instead, generate the SQL file, ask the user to execute it in pgAdmin, then mark it as applied with `db:migrate:resolve`. See the context file for the full step-by-step workflow and troubleshooting.

- **Never use `npx prisma` directly** — Always use the `npm run db:*` scripts with `--prefix server`. Direct `npx prisma` commands skip `.env` and fail. Never pass `--no-engine` to `prisma generate` — it produces a client that only works with Prisma Accelerate and breaks all direct PostgreSQL queries.

- **`db:generate` requires the dev server to be stopped** — `prisma generate` replaces a DLL that is locked while the server runs. Before running `npm run db:generate --prefix server`, ask the user to stop their dev server and wait for confirmation. Never run it automatically.

- **Completed plans as context** — `.plans/completed/` contains 70+ implementation plans covering every feature built in this project. When you need to understand how, why, or in what context something was implemented, search these files by topic (e.g. grep for "newsletter", "crawl", "auth"). Filenames are descriptive — use glob/grep to find relevant plans before asking the user for context.

- **Prefer file tools over bash:** Use Read, Write, Edit, Glob, and Grep tools instead of bash commands for file operations.

- Use `--prefix` for npm commands:

  ```bash
  npm run build --prefix client
  npm run test --prefix client -- --run
  npm run dev --prefix server
  npm run build --prefix server
  npm run test --prefix server
  ```

- **Never use `cd`** — run all commands from the project root. Use `--prefix` for npm or full relative paths for other tools:

  ```bash
  npm run test --prefix server        # Good
  npm run db:generate --prefix server # Good
  git status                          # Good

  cd server && npx vitest run         # Bad — triggers confirmation prompts
  npx prisma generate --schema ...    # Bad — skips .env, may get wrong flags
  cd D:/projects/... && npm run test  # Bad
  ```

## Story Pipeline

Stories flow through these statuses:

```
fetched → pre_analyzed → analyzed → selected → published
                                  ↘ rejected
                       ↘ trashed
```

- **fetched** — Crawled from RSS feed, content extracted
- **pre_analyzed** — Batch LLM pre-screening (conservative rating + emotion tag)
- **analyzed** — Full LLM analysis (detailed ratings, factors, summary, blurb)
- **selected** — LLM-selected for publication from analyzed pool
- **published** — Live on the public site
- **rejected** — Manually or automatically rejected
- **trashed** — Soft-deleted

## Server Configuration

All tunable server constants are centralized in `server/src/config.ts` with environment variable overrides. Before adding a new magic number anywhere in the server, check if it belongs in config.

## Resilience

- **Retry logic**: External HTTP calls (RSS parsing, page fetching, PipFeed API) and LLM calls use `withRetry()` from `server/src/lib/retry.ts` (3 attempts, exponential backoff). Do not add raw `axios` or `parser.parseURL` calls without wrapping in retry.
- **Graceful shutdown**: `server/src/index.ts` handles `SIGTERM`/`SIGINT` with a drain period and force-exit timeout.
- **Global error handler**: `server/src/app.ts` catches unhandled errors (including Prisma `P2025`/`P2002` and known service errors) and returns structured JSON responses.
- **Request correlation**: Every request gets an `X-Request-Id` header (inherited from upstream or generated as UUID). Included in all HTTP log entries via `req.id`.
- **Health check**: `GET /health` verifies database connectivity and returns uptime. Returns 503 if the database is unreachable.

## SEO Checklist

Each page should:

- [ ] Use Helmet with title, description
- [ ] Have unique, descriptive title
- [ ] Have unique meta description (150-160 chars)
- [ ] Be listed in routes.ts for prerendering

## CSS Utility Classes

Defined in `client/src/index.css`:

**Layout:**

- `.page-section` — Standard page wrapper (max-w-3xl, responsive padding)
- `.page-section-wide` — Wider page wrapper (max-w-4xl)

**Typography:**

- `.page-title` — Page headings (text-4xl/5xl, bold, centered)
- `.page-intro` — Subtitle text below page title
- `.prose` — Body text container (text-neutral-600, relaxed leading, auto-styled links)
- `.section-heading` — Section headings (text-2xl)
- `.section-heading-lg` — Larger section headings (text-3xl)

## Bundle Splitting

The client uses `React.lazy()` to split code and reduce initial bundle size. Homepage visitors only download homepage code; other pages load on demand.

**Rules:**

- **HomePage** (`client/src/pages/HomePage.tsx`): Static import in `App.tsx` — this is the critical landing page
- **Other public pages** (`client/src/pages/*.tsx`): Use **`React.lazy()`** in `App.tsx` — prerendering still works (Puppeteer waits for chunks)
- **Admin pages** (`client/src/pages/admin/*.tsx`): Use **`React.lazy()`** in `App.tsx`. Must use `export default` (not named exports).
- **Admin-only npm packages** (`@headlessui/react`, `@heroicons/react`): Automatically code-split via lazy loading.
- **Error boundary:** `ChunkErrorBoundary` and `LazyPage` wrapper handle chunk load failures with reload button.
- **Preloading:** `LoginPage` calls `preloadAdminChunks()` on mount.

## Accessibility (WCAG 2.2 AA)

See `.context/accessibility.md` for full details.

**Common requirements:**

- **Links/buttons**: `focus-visible:ring-2 focus-visible:ring-brand-500`
- **Link color**: Use `text-brand-700` (not brand-600) for AA contrast
- **Images**: Always include `alt` text (use `alt=""` for decorative)
- **Forms**: Every input needs a `<label>` with matching `htmlFor`/`id`
- **Touch targets**: Minimum 24x24px

## Spelling & Language

All hardcoded static text (UI labels, headings, descriptions, error messages, tooltips, meta tags) must use **American English** spelling. Examples: "analyzed" (not "analysed"), "color" (not "colour"), "organize" (not "organise"). Proper nouns that use British spelling (e.g. organization names like "Centre for...") are exempt.

## Context Files

- **`.context/story-pipeline.md`** — Stories flow through 7 statuses from `fetched` to `published`; pre-assessment first assigns each story to an issue via LLM (stored as `story.issueId`), then groups by issue for batch screening; downstream code uses `story.issue ?? story.feed.issue` for issue lookup. Covers status transitions, automated jobs, manual admin endpoints, source fields, AI-generated fields, issue assignment, and slug generation.
- **`.context/content-extraction.md`** — Content extraction uses a 3-tier chain (CSS selector → Readability → configured API with no fallback) with local extraction skipped after `localFailThreshold` consecutive API-only results; set `htmlSelector` on a feed when Readability produces noisy output. Covers the crawl flow, parallel crawling, retry strategy, deduplication, local skip behavior, and how to add new feeds.
- **`.context/llm-analysis.md`** — LLM config is in `server/src/config.ts`; prompts are in `server/src/prompts/`; to change output format update both the prompt and the Zod schema in `schemas/llm.ts`. Covers model tiers (medium for pre-assessment + issue classification, large for assessment/selection/podcast), prompt directory structure, schema-driven format guidance, and the three analysis stages (pre-assessment → assessment → selection).
- **`.context/prompting.md`** — Read before modifying any prompt in `server/src/prompts/`; prompts use GPT-5 conventions (declarative constraints, XML scaffolding, no CoT triggers). Covers structure, key principles, what belongs in prompts vs schemas, and reference links to OpenAI guides.
- **`.context/scheduler.md`** — Jobs run in-process via node-cron with config in the `job_runs` DB table; LLM jobs use semaphore-gated concurrency (configurable via `CONCURRENCY_*` env vars). Covers overlap prevention, overdue detection, error tracking, webhook failure notifications, hot reload on config change, concurrency settings, and the admin API.
- **`.context/images.md`** — Run `npm run images:optimize --prefix client` to generate WebP variants before committing new images. Covers size presets, directory structure, retina support, and CLI commands.
- **`.context/accessibility.md`** — Use `focus-visible:ring-2 focus-visible:ring-brand-500` on all interactive elements and `text-brand-700` (not brand-600) for link contrast. Covers WCAG 2.2 AA patterns, ARIA, forms, navigation, and testing checklist.
- **`.context/seo.md`** — Sitemap is served dynamically by `GET /api/sitemap.xml` (proxied via Render rewrite rule); new pages need routes added in both `client/src/routes.ts` and `server/src/routes/public/sitemap.ts` `STATIC_ROUTES`. Covers Render rewrite setup, cache config, robots.txt, priority guidelines, and change frequency options.
- **`.context/newsletter-podcast.md`** — Newsletters use LLM-generated editorial intro + template-based story blocks with issue section headers, Support Us section, and Plunk unsubscribe link; podcasts use LLM script generation via `buildPodcastPrompt`. Covers the create-assign-generate workflow, all API endpoints, carousel image/PDF/ZIP pipeline, and file locations for modification.
- **`.context/admin-dashboard.md`** — Admin dashboard uses TanStack Query + Headless UI at `/admin/*` with JWT auth; issues support one-level nesting with parent selector, indented table rows, and static content editors (evaluation criteria, sources, links). Covers route structure, key patterns (URL-persisted filters, bulk actions, LLM loading states), and file locations.
- **`.context/authentication.md`** — Auth uses dual-mode middleware (JWT access tokens restricted to HS256 + static API key fallback) with rate limiting on login/refresh; set `JWT_SECRET` env var and create the first admin via `npx tsx server/src/scripts/create-admin.ts`. Covers token flow, cookie config, refresh rotation with reuse detection, password change endpoints, expired token cleanup, user management, roles, and all auth-related file locations.
- **`.context/public-website.md`** — Public site uses `PublicLayout` with hardcoded nav links and a 5-position positivity slider (0-100%) that filters stories by emotional tone client-side (no server round-trip). Covers routes, public API, RSS feeds, positivity slider (context, component, client-side mix helpers), shared components, design system, and key file locations.
- **`.context/embeddings.md`** — Embeddings use `text-embedding-3-small` on titleLabel + title + summary (no issue name or relevance summary) with SHA-256 content hashing; hybrid search combines semantic + text results via Reciprocal Rank Fusion. Covers embedding generation, lifecycle hooks, backfill script, RRF search, configuration, and all file locations.
- **`.context/logging.md`** — Use `createLogger('module')` from `server/src/lib/logger.ts` for all server logging; never use `console.log` in application code (scripts are exempt). Log important steps, including all external API calls, LLM interactions, admin task and Job progress, etc. Covers Pino configuration, structured data patterns, log levels, rotating file transport, and environment variables (`LOG_LEVEL`, `LOG_DIR`, `LOG_RETENTION_DAYS`).
- **`.context/task-queue.md`** — Bulk LLM operations use server-side task queue with polling; submit story IDs via `POST /stories/bulk-*` and poll `GET /stories/tasks/:taskId` for progress. Covers task registry, bulk analysis wrappers, client polling hook (`launchPolledTask`), processing indicators in StoryTable, and concurrency configuration.
- **`.context/database-migrations.md`** — **MANDATORY:** Never use `npx prisma` directly (skips `.env`), never use `--no-engine` on generate (breaks all queries), never run `prisma migrate dev` (DLL locks), and never run `db:generate` without asking the user to stop their dev server first (DLL lock); always use `npm run db:*` scripts with `--prefix server`. Covers the full SQL-first migration workflow, allowed/banned command tables, and troubleshooting for advisory locks, failed migrations, and schema drift.
- **`client/.context/skeletons.md`** — All components loading data dynamically must show skeletons while loading to prevent CLS; use `isLoading` from TanStack Query hooks. Covers available skeleton components, creation guidelines, usage patterns, and design principles.
