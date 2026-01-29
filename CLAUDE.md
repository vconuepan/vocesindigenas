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

## Accessibility (WCAG 2.2 AA)

See `.context/accessibility.md` for full details.

**Common requirements:**

- **Links/buttons**: `focus-visible:ring-2 focus-visible:ring-brand-500`
- **Link color**: Use `text-brand-700` (not brand-600) for AA contrast
- **Images**: Always include `alt` text (use `alt=""` for decorative)
- **Forms**: Every input needs a `<label>` with matching `htmlFor`/`id`
- **Touch targets**: Minimum 24x24px

## Context Files

- **`.context/story-pipeline.md`** — Stories flow through 7 statuses from `fetched` to `published`; only stories with pre-assessment rating >= 3 proceed to full analysis. Covers status transitions, automated jobs, manual admin endpoints, and all AI-generated story fields.
- **`.context/content-extraction.md`** — Content extraction uses a 3-tier fallback chain (CSS selector → Readability → PipFeed API); set `htmlSelector` on a feed when Readability produces noisy output. Covers the crawl flow, deduplication, and how to add new feeds.
- **`.context/llm-analysis.md`** — All three LLM stages use `withStructuredOutput` + Zod schemas; to change output format, update both the prompt in `prompts.ts` AND the schema in `schemas/llm.ts`. Covers model configuration, the three analysis stages, issue-specific guidelines, and prompt modification.
- **`.context/scheduler.md`** — Jobs run in-process via node-cron with config in the `job_runs` DB table; add new jobs by creating a handler, registering it in `scheduler.ts`, and adding a DB row. Covers overlap prevention, overdue detection, error tracking, and the admin API.
- **`.context/images.md`** — Run `npm run images:optimize --prefix client` to generate WebP variants before committing new images. Covers size presets, directory structure, retina support, and CLI commands.
- **`.context/accessibility.md`** — Use `focus-visible:ring-2 focus-visible:ring-brand-500` on all interactive elements and `text-brand-700` (not brand-600) for link contrast. Covers WCAG 2.2 AA patterns, ARIA, forms, navigation, and testing checklist.
- **`.context/seo.md`** — Add sitemap metadata to `client/src/routes.ts` for every new page; the sitemap is auto-generated during build. Covers robots.txt, priority guidelines, and change frequency options.
- **`.context/newsletter-podcast.md`** — Newsletters use template-based formatting and carousel image generation; podcasts use LLM script generation via `buildPodcastPrompt`. Covers the create-assign-generate workflow, all API endpoints, carousel image/PDF/ZIP pipeline, and file locations for modification.
- **`.context/admin-dashboard.md`** — Admin dashboard uses TanStack Query + Headless UI at `/admin/*` with JWT auth; add new pages by creating a page component, hook file, and route in `App.tsx`. Covers route structure, key patterns (URL-persisted filters, bulk actions, LLM loading states), and file locations.
- **`.context/authentication.md`** — Auth uses dual-mode middleware (JWT access tokens + static API key fallback); set `JWT_SECRET` env var and create the first admin via `npx tsx server/src/scripts/create-admin.ts`. Covers token flow, cookie config, refresh rotation, user management, roles, and all auth-related file locations.
- **`.context/public-website.md`** — Public site uses `PublicLayout` with hardcoded nav links; add new nav items in `NAV_LINKS` array in `PublicLayout.tsx`. Covers routes, public API, shared components, static content data file, design system (Nexa/Roboto fonts, pink brand), and key file locations.

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
