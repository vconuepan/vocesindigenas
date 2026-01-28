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
├── .to-migrate/     # PHP reference files from original WordPress plugin
├── backlog.md       # Deferred features
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

## Deployment (Render.com)

Three services:

### 1. Frontend (Static Site)
- **Build Command:** `cd client && npm install && npm run build`
- **Publish Directory:** `client/dist`
- **Environment Variables:** `VITE_API_URL`

### 2. Backend (Web Service)
- **Build Command:** `cd server && npm install && npx prisma generate && npm run build`
- **Start Command:** `cd server && npm start`
- **Environment Variables:** `DATABASE_URL`, `OPENAI_API_KEY`, `FRONTEND_URL`, `PORT`, `ADMIN_API_KEY`

### 3. PostgreSQL Database
- Enable pgvector extension

### Local Development

1. Install PostgreSQL locally, create database `actually_relevant`
2. Copy `server/.env.sample` to `server/.env` and fill in values
3. Run migrations: `npm run db:migrate --prefix server`
4. Start servers:
   - Frontend: `npm run dev --prefix client` (localhost:5173)
   - Backend: `npm run dev --prefix server` (localhost:3001)

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

- **`.context/images.md`** — Image optimization system: CLI commands, size presets, directory structure. **Read before adding images.**
- **`.context/accessibility.md`** — WCAG 2.2 AA compliance: ARIA patterns, color contrast, keyboard navigation.
- **`.context/seo.md`** — Sitemap and robots.txt: generation, priority guidelines.

## Migration Reference

PHP reference files from the original WordPress plugin are in `.to-migrate/`. See `.to-migrate/REFERENCE.md` for what each file contains and which migration phase needs it.
