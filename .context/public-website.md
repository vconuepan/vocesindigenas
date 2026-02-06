# Public Website

The public site uses `PublicLayout` with hardcoded navigation links to issue pages, methodology, and about; add new nav items in `NAV_LINKS` array in `PublicLayout.tsx`. This document covers routes, components, data flow, and static content structure.

## Routes

| Path | Component | Description |
|---|---|---|
| `/` | `HomePage` | Hero + latest stories per issue |
| `/stories/:id` | `StoryPage` | Story detail with AI analysis |
| `/issues/:slug` | `IssuePage` | Issue description + paginated stories + evaluation criteria |
| `/methodology` | `MethodologyPage` | Three-criteria framework explanation |
| `/about` | `AboutPage` | Mission and approach |
| `/contact` | `ContactPage` | Email + bilingual imprint (EN/DE) |

All routes are registered in both `App.tsx` and `routes.ts` (for sitemap generation). Static routes (issues, methodology, about, contact) are prerendered at build time. Dynamic story routes are added to the sitemap via `generate-sitemap.ts`.

## Public API

- `GET /api/stories` — Paginated published stories, filterable by `issueSlug` and `positivity` (0-100)
- `GET /api/stories/:id` — Single published story
- `GET /api/issues` — All issues (id, name, slug, description only)
- `GET /api/issues/:slug` — Single issue by slug

API client: `client/src/lib/api.ts` (exports `publicApi` and `API_BASE`)
Hooks: `usePublicStories.ts`, `usePublicIssues.ts`

### RSS Feeds

Public RSS 2.0 feeds are available without authentication:

- `GET /api/feed` — Global feed of the 50 most recent published stories
- `GET /api/feed/:issueSlug` — Per-issue feed (e.g., `/api/feed/human-development`)

Feed items include: title, link to story page, AI-generated summary, publish date, and issue category. Responses use `Content-Type: application/rss+xml` with a 15-minute cache (`Cache-Control: public, max-age=900`).

**Discoverability:**
- Global RSS autodiscovery `<link>` tag is added via Helmet in `PublicLayout.tsx`
- Per-issue autodiscovery `<link>` tag is added via Helmet in `IssuePage.tsx`
- Visible RSS icon/link appears on each issue page header and in the footer Subscribe section
- All RSS hrefs use `API_BASE` (from `client/src/lib/api.ts`) so they resolve correctly in both dev (Vite proxy) and production (separate static site + API service on Render)

**Key files:**
- `server/src/routes/public/feed.ts` — RSS feed route handler (uses `feed` npm package)
- `server/src/routes/public/index.ts` — Registers feed router at `/feed`
- `client/vite.config.ts` — Dev proxy for `/api` to `localhost:3001`

## Positivity Slider

A 5-position slider (0%, 25%, 50%, 75%, 100%) that controls the emotional tone of displayed stories. Default is 50% (balanced). Persisted in localStorage under `ar-positivity`. Filtering is done entirely client-side for instant response — no additional API requests on slider change.

- **Desktop:** Positioned in the logo bar, left side
- **Mobile:** First item in the hamburger menu (centered), above issue categories
- **Scope:** Affects homepage and issue pages only. Search is not affected.
- **Architecture:** Server returns both positive and negative story buckets. Client mixes them based on slider position using helpers in `lib/mix-stories.ts`. No positivity param is sent to the server.
- **Homepage:** Server returns `storiesPerIssue` stories from each emotion bucket per issue. Client uses `mixHomepageStories()` to pick a fixed-count mix.
- **Issue pages:** Server returns all stories (no emotion filtering). Client uses `filterStoriesByPositivity()` to filter and paginates locally.
- **Emojis:** Frustrated/scared (left) to calm/uplifting (right), with text labels ("All FRUSTRATING & SCARY", "Balanced", "All CALM & UPLIFTING")
- **Info tooltip:** Click info icon next to slider for explanation

**Key files:**
- `client/src/components/PositivitySlider.tsx` — Slider UI with emoji labels and info tooltip
- `client/src/contexts/PositivityContext.tsx` — React Context + localStorage persistence
- `client/src/lib/mix-stories.ts` — `mixHomepageStories()` and `filterStoriesByPositivity()` helpers
- `server/src/services/story.ts` — `getHomepageData()` returns `{ positive, negative }` per issue

## Shared Components

- `StoryCard` — Story card with title, rating, summary (used on homepage + issue pages)
- `RatingDisplay` — Relevance rating with color coding
- `Pagination` — Page navigation with ellipsis

## Static Content

Issue-specific evaluation criteria, sources, and "make a difference" links are in `client/src/data/issues-content.ts`. This data is static and doesn't come from the API. To update, edit the file directly.

Current issue slugs: `existential-threats`, `planet-climate`, `human-development`, `science-technology`

## Design

- **Colors:** Pink/magenta brand palette (`#ec268f` primary, `#661845` deep)
- **Layout:** Sticky header, dark footer, max-w-5xl content area
- **Mobile:** Hamburger menu at `lg` breakpoint

### Fonts

Self-hosted from `/fonts/`. Only these fonts are loaded (adding more increases page load):

| Font | Weight | Tailwind Class | Use For |
|------|--------|----------------|---------|
| Nexa Bold | 700 | `font-nexa font-bold` | Headings, logo text |
| Roboto Regular | 400 | (default body) | Body text |
| Roboto Bold | 700 | `font-bold` | Bold body text |

**Do NOT use:** `font-light`, `font-thin`, `font-black`, `font-medium`, or `font-nexa` without `font-bold` — these weights are not loaded and will trigger browser fallback or extra downloads.

Font definitions: `client/src/index.css` (@font-face)
Preload hints: `client/index.html`

## Key Files

- `client/src/layouts/PublicLayout.tsx` — Header, footer, navigation, positivity slider placement
- `client/src/pages/HomePage.tsx` — Homepage with issue sections
- `client/src/pages/StoryPage.tsx` — Story detail
- `client/src/pages/IssuePage.tsx` — Issue page with stories + static content
- `client/src/components/PositivitySlider.tsx` — Positivity slider UI
- `client/src/contexts/PositivityContext.tsx` — Positivity state + localStorage
- `client/src/data/issues-content.ts` — Static evaluation/sources/links per issue
- `client/src/lib/api.ts` — Public API client
- `server/src/routes/public/issues.ts` — Public issues endpoint
- `server/src/routes/public/homepage.ts` — Homepage data with emotion-bucketed stories
