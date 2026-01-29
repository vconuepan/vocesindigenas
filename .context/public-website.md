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

- `GET /api/stories` — Paginated published stories, filterable by `issueSlug`
- `GET /api/stories/:id` — Single published story
- `GET /api/issues` — All issues (id, name, slug, description only)
- `GET /api/issues/:slug` — Single issue by slug

API client: `client/src/lib/api.ts` (exports `publicApi`)
Hooks: `usePublicStories.ts`, `usePublicIssues.ts`

## Shared Components

- `StoryCard` — Story card with title, emotion badge, rating, summary (used on homepage + issue pages)
- `EmotionBadge` — Colored badge per emotion tag
- `RatingDisplay` — Relevance rating with color coding
- `Pagination` — Page navigation with ellipsis

## Static Content

Issue-specific evaluation criteria, sources, and "make a difference" links are in `client/src/data/issues-content.ts`. This data is static and doesn't come from the API. To update, edit the file directly.

Current issue slugs: `existential-threats`, `planet-climate`, `human-development`, `science-technology`

## Design

- **Fonts:** Nexa Bold (headings), Roboto (body) — self-hosted from `/fonts/`
- **Colors:** Pink/magenta brand palette (`#ec268f` primary, `#661845` deep)
- **Layout:** Sticky header, dark footer, max-w-5xl content area
- **Mobile:** Hamburger menu at `lg` breakpoint

## Key Files

- `client/src/layouts/PublicLayout.tsx` — Header, footer, navigation
- `client/src/pages/HomePage.tsx` — Homepage with issue sections
- `client/src/pages/StoryPage.tsx` — Story detail
- `client/src/pages/IssuePage.tsx` — Issue page with stories + static content
- `client/src/data/issues-content.ts` — Static evaluation/sources/links per issue
- `client/src/lib/api.ts` — Public API client
- `server/src/routes/public/issues.ts` — Public issues endpoint
