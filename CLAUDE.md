# Actually Relevant

AI-curated news platform that evaluates article relevance to humanity using LLM analysis. Crawls news sources, assesses relevance, and publishes curated content.

## Project Structure

```
actually-relevant/
├── client/          # React frontend (Vite + TypeScript + Tailwind)
├── server/          # Express backend (Prisma + LangChain + OpenAI)
├── shared/          # Shared types and constants
├── .context/        # Context documentation
├── .plans/          # Development planning documents
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

- **Ask the user to stop the dev server before running any Prisma/database commands** — The dev server holds a database connection and can interfere with migrations, seeding, and other Prisma operations. Always ask the user to stop `npm run dev --prefix server` before running `db:migrate`, `db:seed`, or any other database command.

- **Never run `db:migrate` without `--name`** — `npm run db:migrate` (which runs `prisma migrate dev`) is interactive and will prompt for a migration name. This blocks the terminal and leaves a PostgreSQL advisory lock that prevents all subsequent migration commands. Use these non-interactive alternatives instead:

  ```bash
  # Create migration file only (does NOT apply it):
  npm run db:migrate:create --prefix server -- --name migration_name

  # Apply all pending migrations (non-interactive, safe for CI):
  npm run db:migrate:deploy --prefix server

  # Mark a migration as already applied (e.g. after manual SQL):
  npm run db:migrate:resolve --prefix server -- --applied MIGRATION_NAME

  # Check migration status:
  npm run db:migrate:status --prefix server

  # Or use db:migrate with --name to avoid the interactive prompt:
  npm run db:migrate --prefix server -- --name migration_name
  ```

  If a migration gets stuck with an advisory lock, the user must release it via pgAdmin: `SELECT pg_advisory_unlock(72707369);`

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
  npx prisma generate --schema server/prisma/schema.prisma  # Good
  git status                          # Good

  cd server && npx vitest run         # Bad — triggers confirmation prompts
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

The client uses `React.lazy()` to split admin code from the public bundle. Public visitors never download admin pages, `@headlessui/react`, or `@heroicons/react`.

**Rules:**

- **Public pages** (`client/src/pages/*.tsx`): Always use **static imports** in `App.tsx` (required for prerendering)
- **Admin pages** (`client/src/pages/admin/*.tsx`): Always use **`React.lazy()`** in `App.tsx`. Must use `export default` (not named exports).
- **Admin-only npm packages** (`@headlessui/react`, `@heroicons/react`): Grouped into the `admin-vendor` chunk via `manualChunks` in `vite.config.ts`. If adding a new admin-only dependency, add it there too.
- **Shared npm packages** (`@tanstack/react-query`, `react-markdown`, `date-fns`, `react-router-dom`): Stay in the main bundle — do not add them to `manualChunks`.
- **Error boundary:** `ChunkErrorBoundary` wraps admin routes to catch chunk load failures (e.g. after deployments) and offer a reload button.
- **Preloading:** `LoginPage` calls `preloadAdminChunks()` on mount so the admin layout and dashboard are fetched while the user types credentials.

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

- **`.context/story-pipeline.md`** — Stories flow through 7 statuses from `fetched` to `published`; only stories with `relevancePre >= 3` proceed to full analysis, and only `analyzed` stories with `relevance >= 5` enter selection (batched into groups of ≤20). Covers status transitions, automated jobs, manual admin endpoints, source fields, AI-generated fields, and slug generation (slugs are created on first publish from the title, are immutable by default, and use `-2`/`-3` suffixes for duplicates).
- **`.context/content-extraction.md`** — Content extraction uses a 3-tier fallback chain (CSS selector → Readability → PipFeed API); set `htmlSelector` on a feed when Readability produces noisy output. Covers the crawl flow, deduplication, and how to add new feeds.
- **`.context/llm-analysis.md`** — LLM config is in `server/src/config.ts`; prompts are in `server/src/prompts/`; to change output format update both the prompt and the Zod schema in `schemas/llm.ts`. Covers model tiers, prompt directory structure, schema-driven format guidance, and the three analysis stages.
- **`.context/prompting.md`** — Read before modifying any prompt in `server/src/prompts/`; prompts use GPT-5 conventions (declarative constraints, XML scaffolding, no CoT triggers). Covers structure, key principles, what belongs in prompts vs schemas, and reference links to OpenAI guides.
- **`.context/scheduler.md`** — Jobs run in-process via node-cron with config in the `job_runs` DB table; LLM jobs use semaphore-gated concurrency (default 5, configurable via `CONCURRENCY_*` env vars). Covers overlap prevention, overdue detection, error tracking, concurrency settings, and the admin API.
- **`.context/images.md`** — Run `npm run images:optimize --prefix client` to generate WebP variants before committing new images. Covers size presets, directory structure, retina support, and CLI commands.
- **`.context/accessibility.md`** — Use `focus-visible:ring-2 focus-visible:ring-brand-500` on all interactive elements and `text-brand-700` (not brand-600) for link contrast. Covers WCAG 2.2 AA patterns, ARIA, forms, navigation, and testing checklist.
- **`.context/seo.md`** — Add sitemap metadata to `client/src/routes.ts` for every new page; the sitemap is auto-generated during build. Covers robots.txt, priority guidelines, and change frequency options.
- **`.context/newsletter-podcast.md`** — Newsletters use template-based formatting and carousel image generation; podcasts use LLM script generation via `buildPodcastPrompt`. Covers the create-assign-generate workflow, all API endpoints, carousel image/PDF/ZIP pipeline, and file locations for modification.
- **`.context/admin-dashboard.md`** — Admin dashboard uses TanStack Query + Headless UI at `/admin/*` with JWT auth; issues support one-level nesting with parent selector, indented table rows, and static content editors (evaluation criteria, sources, links). Covers route structure, key patterns (URL-persisted filters, bulk actions, LLM loading states), and file locations.
- **`.context/authentication.md`** — Auth uses dual-mode middleware (JWT access tokens + static API key fallback); set `JWT_SECRET` env var and create the first admin via `npx tsx server/src/scripts/create-admin.ts`. Covers token flow, cookie config, refresh rotation, user management, roles, and all auth-related file locations.
- **`.context/public-website.md`** — Public site uses `PublicLayout` with hardcoded nav links; RSS feed links use `API_BASE` from `client/src/lib/api.ts` so they resolve in both dev (Vite proxy) and production (separate origins on Render). Covers routes, public API, RSS feeds (`/api/feed` and `/api/feed/:issueSlug`), shared components, design system, and key file locations.
- **`.context/logging.md`** — Use `createLogger('module')` from `server/src/lib/logger.ts` for all server logging; never use `console.log` in application code (scripts are exempt). Covers Pino configuration, structured data patterns, log levels, rotating file transport, and environment variables (`LOG_LEVEL`, `LOG_DIR`, `LOG_RETENTION_DAYS`).
- **`.context/task-queue.md`** — Bulk LLM operations use server-side task queue with polling; submit story IDs via `POST /stories/bulk-*` and poll `GET /stories/tasks/:taskId` for progress. Covers task registry, bulk analysis wrappers, client polling hook (`launchPolledTask`), processing indicators in StoryTable, and concurrency configuration.

## Implementation Workflow

Follow these steps for every implementation task:

1. **Plan** — Use `/everything-claude-code:plan` to create a plan document. Save it as a `.md` file in `.plans/`.

2. **Implement** — Use TDD via `/everything-claude-code:tdd` for logic using the project's test infrastructure. For UI or data-related work, implement step by step without TDD.

3. **Check** — Run `npm run build --prefix server` and `npm run test --prefix server -- --run` (and/or the client equivalents). Fix any failures before proceeding. For larger UI changes, use playwright tools.

4. **Review** (for non-trivial work) — Use `/everything-claude-code:code-review` and implement the most important improvement suggestions.

5. **Document** — Create or update `.context/` files for any important components, systems, or mechanics that were added or changed. Update the Context Files section in this `CLAUDE.md` if new context files were added. Each context file entry needs:
   - One sentence with the most actionable information for a coding assistant
   - One sentence summarizing additional information found in the context file

6. **Update Tracking** — Update any plans, backlog files, or other tracking documents that referenced this work to mark it as completed.

A task is **not done** until steps 3, 5, and 6 are complete.

## Migration Reference

PHP reference files from the original WordPress plugin are in `.to-migrate/`. See `.to-migrate/REFERENCE.md` for what each file contains and which migration phase needs it.
