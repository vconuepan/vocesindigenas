# Phase 0: Project Scaffolding — Implementation Plan

## Overview

Set up the full monorepo structure with all tooling, ported infrastructure, and adapted documentation. No feature code — just the skeleton that later phases build on.

## Steps

### Step 1: Root configuration files

Create at project root:
- `.gitignore` — adapted from odins-website (add prisma, .env patterns)
- `package.json` — root workspace scripts (convenience scripts for running client/server)

### Step 2: Client scaffolding

Initialize `client/` with Vite + React 18 + TypeScript + Tailwind.

**Files to create:**
- `client/package.json` — adapted from odins-website, keep: react, react-dom, react-helmet-async, react-router-dom, tailwind, vitest, testing-library, sharp, prerenderer. Remove: nothing app-specific needed yet.
- `client/vite.config.ts` — from odins-website, update `@shared` alias, keep prerenderer config but with empty routes for now
- `client/tsconfig.json` — from odins-website verbatim (has `@shared` path alias)
- `client/tailwind.config.js` — from odins-website, update brand colors for Actually Relevant identity
- `client/postcss.config.js` — from odins-website verbatim
- `client/index.html` — minimal Vite entry point, updated title/meta for Actually Relevant
- `client/src/index.css` — from odins-website, keep generic utilities (page-section, page-title, prose, section-heading), remove animation-specific classes, keep base body/link styling
- `client/src/main.tsx` — React entry with BrowserRouter + HelmetProvider
- `client/src/App.tsx` — minimal router with placeholder home page and 404
- `client/src/routes.ts` — route config for news site: `/`, `/stories`, `/stories/:slug`, `/issues/:slug`, `/methodology`, `/about`, `/contact`, `/admin/*`
- `client/src/pages/HomePage.tsx` — placeholder
- `client/src/pages/NotFoundPage.tsx` — placeholder
- `client/src/layouts/PublicLayout.tsx` — shell with header/main/footer slots
- `client/src/test/setup.ts` — from odins-website verbatim (`import '@testing-library/jest-dom'`)
- `client/src/lib/sitemap.ts` — sitemap XML generation utility (port from odins-website)
- `client/src/lib/sitemap.test.ts` — port existing test

**Build scripts to port:**
- `client/scripts/generate-sitemap.ts` — update BASE_URL to `https://actuallyrelevant.news`
- `client/scripts/images.mjs` — port verbatim (generic image optimization, no site-specific logic)
- `client/scripts/generate-og-image.mjs` — update text/branding for Actually Relevant

### Step 3: Server scaffolding

Initialize `server/` with Express + TypeScript + Prisma + LangChain.

**Files to create:**
- `server/package.json` — adapted from odins-website. Keep: express, cors, helmet, dotenv, express-rate-limit, zod, @langchain/core, @langchain/openai, vitest, supertest, tsx. Add: @prisma/client, prisma (dev), node-cron, @types/node-cron. Add: langchain.
- `server/tsconfig.json` — from odins-website verbatim
- `server/vitest.config.ts` — from odins-website verbatim
- `server/.env.sample` — DATABASE_URL, OPENAI_API_KEY, FRONTEND_URL, PORT, ADMIN_API_KEY
- `server/src/index.ts` — adapted from odins-website: keep CORS/Helmet/health/trust-proxy setup, add placeholder route mounting points for admin and public APIs, add scheduler initialization call
- `server/src/middleware/rateLimit.ts` — port from odins-website, generalize (not tied to "suggest" endpoint)
- `server/src/middleware/auth.ts` — skeleton admin auth middleware (check `Authorization: Bearer <ADMIN_API_KEY>` header)
- `server/src/routes/health.ts` — extracted health check route
- `server/src/routes/admin/index.ts` — admin route group (placeholder, mounts auth middleware)
- `server/src/routes/public/index.ts` — public route group (placeholder)
- `server/src/jobs/scheduler.ts` — skeleton: reads job_runs from DB, registers node-cron jobs, startup catch-up logic (empty job implementations for now)

**Prisma setup:**
- `server/prisma/schema.prisma` — full schema from plan: stories, feeds, issues, newsletters, podcasts, job_runs, users (skeleton). Enable pgvector extension.

### Step 4: Shared types

- `shared/types/index.ts` — shared enums (StoryStatus, EmotionTag, UserRole, JobName) and common interfaces
- `shared/constants/index.ts` — shared constants (story statuses, emotion tags)

### Step 5: Context documentation

Port and adapt `.context/` files:
- `.context/seo.md` — update domain to `actuallyrelevant.news`, update priority guidelines for news site (articles daily, categories weekly, static pages monthly), update route examples
- `.context/images.md` — update examples from portfolio images to news thumbnails/category icons, mostly keep as-is since the system is generic
- `.context/accessibility.md` — update "Common Patterns" table to reference new components (remove HomePage accordion, Carousel, WorkFilters references; add placeholder notes for StoryList, StoryFilters, AdminLayout)

### Step 6: CLAUDE.md

Adapted from odins-website CLAUDE.md:
- Update project name, description, structure diagram
- Update tech stack (add Prisma, PostgreSQL, pgvector, node-cron)
- Update commands (add prisma migrate, prisma generate, prisma studio; add server jobs)
- Keep: Tips for Claude (--prefix convention, file tools preference)
- Keep: Deployment section (update for 3 Render services: static + web + postgres)
- Keep: SEO checklist (adapt for news routes)
- Remove: Canonical Components (Quotation), Writing Style, Adding New Pages
- Add: Story pipeline overview (fetched → pre_analyzed → analyzed → selected → published)
- Add: Context files reference pointing to the 3 .context files
- Add: Reference to `.to-migrate/REFERENCE.md` for PHP migration sources

### Step 7: README.md

Adapted from odins-website README.md:
- Project name and description for Actually Relevant
- Tech stack (add database)
- Local development setup (add: install postgres, create DB, prisma migrate dev, prisma generate)
- Deployment guide (3 Render services)
- Environment variables reference (DATABASE_URL, OPENAI_API_KEY, FRONTEND_URL, PORT, ADMIN_API_KEY)
- Project structure diagram
- Troubleshooting section (keep relevant parts)
- Remove: all personal site references, custom domain specifics for odins.website

### Step 8: Install dependencies and verify

- Run `npm install` in client/ and server/
- Run `npx prisma generate` in server/
- Run `npm run build --prefix client` to verify client builds
- Run `npm run build --prefix server` to verify server builds
- Run `npm run test --prefix client -- --run` to verify test infrastructure
- Run `npm run test --prefix server` to verify test infrastructure

### Step 9: Clean up .to-migrate

After all Phase 0 porting is done:
- Delete `.to-migrate/.odins-website/`
- Delete `.to-migrate/.context/`
- Delete `.to-migrate/CLAUDE.md`
- Delete `.to-migrate/README.md`
- Update `.to-migrate/REFERENCE.md` to remove the [TEMPORARY] items

### Step 10: Commit

Stage everything and commit with a descriptive message.

## Verification

- `npm run build --prefix client` succeeds
- `npm run build --prefix server` succeeds
- `npm run test --prefix client -- --run` passes (sitemap test)
- `npm run test --prefix server` passes (no tests yet, but vitest runs)
- `npx prisma validate --schema server/prisma/schema.prisma` succeeds
- Placeholder pages render in dev mode
