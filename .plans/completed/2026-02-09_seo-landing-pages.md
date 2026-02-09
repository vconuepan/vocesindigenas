# SEO Landing Pages Implementation Plan

## Requirements

Build 5 SEO landing pages based on specs in `pm/artifacts/landing-pages/`:

1. **`/compare`** (NEW) — Comparison table page: AR vs Google News, Flipboard, Ground News, etc.
2. **`/methodology`** (ENHANCE) — Expand existing page with sources, "what we don't do", positivity slider, CTA
3. **`/no-ads-no-tracking`** (NEW) — Privacy/ad-free commitment page with mini comparison table
4. **`/news-fatigue`** (NEW) — News fatigue solution page, empathetic tone
5. **`/free-api`** (NEW) — Marketing page for the free API with code blocks and endpoint table

Each page needs: SEO meta tags (title, description, OG, Twitter Card), structured data (JSON-LD with breadcrumbs), internal cross-linking, responsive design, and prerendering support.

## User Decisions

- **API page path**: `/free-api` (avoids conflict with backend `/api/*` routes)
- **Footer**: Add "Compare" and "News Fatigue" to Navigate column. Replace "No cookies" link with "No tracking" pointing to `/no-ads-no-tracking`.
- **Source lists on /methodology**: Pull dynamically from DB. Add `region` field to feeds table. "By Issue Area" already available via public issues endpoint (which returns `sourceNames`). "By Region" requires new `region` column + new public endpoint.
- **Mobile comparison table**: Horizontal scroll + card view toggle.

## Risks

- **MEDIUM**: Adding `region` field to feeds requires a DB migration. Must follow `.context/database-migrations.md` workflow (generate SQL, user runs in pgAdmin, then resolve).
- **LOW**: Need a new public API endpoint for sources grouped by region. Minimal backend work.
- **LOW**: Card view toggle adds UI complexity to ComparisonTable component.

## Implementation Phases

### Phase 0: Database Migration — Add `region` to Feeds

Add a `region` column to the `feeds` table for geographic classification.

**Schema change** (`server/prisma/schema.prisma`):
- Add `region String? @map("region")` to Feed model

**Migration**:
- Generate SQL migration file via `npm run db:migrate --prefix server -- --create-only --name add_feed_region`
- User runs SQL in pgAdmin
- Mark as resolved
- Regenerate Prisma client (user must stop dev server first)
- Populate region values for existing feeds (can be done via a seed script or manually)

**New public endpoint** (`server/src/routes/public/sources.ts`):
- `GET /api/sources` — returns active feeds grouped by region, with `displayTitle`/`title` and issue area name
- Cached (5 min TTL like issues endpoint)
- Response shape: `{ byRegion: { [region: string]: string[] }, byIssue: { [issueName: string]: string[] }, totalCount: number }`

**Regions** (based on spec):
- `global` — Global & Western
- `sub-saharan-africa` — Sub-Saharan Africa
- `eastern-europe` — Eastern Europe
- `middle-east-north-africa` — Middle East & North Africa
- `south-southeast-asia` — South & Southeast Asia
- `pacific` — Pacific
- `latin-america` — Latin America

### Phase 1: Shared Components

**1a. `LandingCta` component** (`client/src/components/LandingCta.tsx`)
- Props: `heading: string`, `description: string`
- Two buttons: "Read today's stories →" (Link to `/`) and "Subscribe to the newsletter →" (opens SubscribeModal via `useSubscribe()`)
- Styling: centered section with top border, brand-colored primary button, outlined secondary button
- Focus-visible ring on buttons per accessibility guidelines

**1b. `StructuredData` component** (`client/src/components/StructuredData.tsx`)
- Props: `data: Record<string, unknown>` (or multiple via `data: Record<string, unknown>[]`)
- Renders one or more `<script type="application/ld+json">` tags
- Not inside Helmet — just inline in the component (avoids Helmet quirks with JSON serialization)

**1c. `buildBreadcrumb` helper** (add to `client/src/lib/structured-data.ts`)
- Already exists as `buildBreadcrumbSchema(items)`. Just use it.

**1d. `ComparisonTable` component** (`client/src/components/ComparisonTable.tsx`)
- Props: `headers: string[]`, `rows: { feature: string; cells: string[] }[]`, `highlightColumn?: number`
- Desktop: horizontal scroll table with sticky first column, highlighted column with brand background
- Mobile: toggle between table view (horizontal scroll) and card view (stacked cards per competitor)
- Accessible: proper `<th>` scope, `aria-label` on toggle

### Phase 2: `/compare` page

**File:** `client/src/pages/ComparePage.tsx`

- H1: "How Does Actually Relevant Compare?"
- Intro paragraph
- Full comparison table (10 features × 7 competitors) using `ComparisonTable` with AR column highlighted
- "What Makes Actually Relevant Different" — 3 H3 subsections
- "Who We're Best For" — 4 bullet points with internal links to `/news-fatigue`, `/free-api`, `/no-ads-no-tracking`, `/methodology`
- `LandingCta` with heading "Ready to try news that's actually relevant?"
- Structured data: WebPage + Table + BreadcrumbList
- Meta: "Google News Alternatives Compared — Actually Relevant" / 160-char description

### Phase 3: `/methodology` enhancement

**File:** `client/src/pages/MethodologyPage.tsx` (existing)

Changes:
- Update meta title → "Our Methodology — How AI Curates the News | Actually Relevant"
- Update meta description → 160-char version from spec
- Fix "over 50" → "over 80 curated news sources across five languages"
- Expand Collection and Pre-screening stage descriptions
- Add optional detail to Analysis stage
- NEW "Our Sources" section — fetched dynamically from `GET /api/sources`:
  - "By Region" — grouped by region (from new endpoint)
  - "By Issue Area" — grouped by issue name (from new endpoint)
  - Loading skeleton while fetching
  - Total count shown dynamically
- NEW "What We Don't Do" — 4 bold bullet points
- NEW "The Positivity Slider" — short explanation + link to `/news-fatigue`
- Expand "Transparency" section — add links to `/compare` and `/free-api`
- Add `LandingCta` at bottom
- Add structured data: TechArticle + BreadcrumbList

### Phase 4: `/news-fatigue` page

**File:** `client/src/pages/NewsFatiguePage.tsx`

- H1: "You're Not Avoiding the News Because You Don't Care"
- Empathetic intro referencing Reuters Institute 40% stat
- "The Problem Isn't the News. It's the Delivery." — 4 bullet points + "what if" bridge
- "A Different Approach" — 4 H3 subsections
- "What Staying Informed Looks Like" — numbered morning routine
- "Built for People Who Care" — 4 issue areas
- "No Tricks, No Traps" — links to `/no-ads-no-tracking` and `/methodology`
- `LandingCta` with heading "Stay informed without the burnout."
- Structured data: Article + BreadcrumbList
- Meta tags per spec

### Phase 5: `/no-ads-no-tracking` page

**File:** `client/src/pages/NoAdsNoTrackingPage.tsx`

- H1: "News Without Ads, Tracking, or Clickbait"
- "What We Don't Collect" — 4 bold items
- "What We Don't Show" — 3 bold items
- "How We Stay Free" — non-commercial explanation
- "Why This Matters" — 3 bullet points on ad model consequences
- "What You Get Instead" — feature list + link to `/methodology`
- "Compare Your Options" — mini 5-row table using `ComparisonTable`
- Link to `/compare`
- `LandingCta` with heading "Read the news without being the product."
- Structured data: WebPage + Organization (nonprofitStatus) + BreadcrumbList

### Phase 6: `/free-api` page

**File:** `client/src/pages/FreeApiPage.tsx`

- H1: "A Free API for News That Matters"
- "Quick Start" — syntax-highlighted curl code blocks (using `<pre><code>` with Tailwind styling)
- "What Makes This Different" — 4 H3 subsections + link to `/methodology`
- "Use Cases" — 5 use cases
- "What's Available" — endpoint table
- "How This Compares to Other News APIs" — mini comparison table
- "RSS Feeds" — 4 feed URLs
- CTA: "Read the API docs →" (Link to `/developers`) + "Try it now →" (link to `/api/stories/today`)
- Structured data: WebPage + WebAPI + BreadcrumbList
- Meta tags per spec (updated URL to `/free-api`)

### Phase 7: Routing, Sitemap, Navigation

**7a. Client routing** (`client/src/App.tsx`):
- Add lazy imports for 4 new page components (ComparePage, NoAdsNoTrackingPage, NewsFatiguePage, FreeApiPage)
- Add routes under PublicLayout

**7b. Route config** (`client/src/routes.ts`):
- Add 4 new routes with `priority: 0.7` and `changefreq: 'monthly'`

**7c. Server sitemap** (`server/src/routes/public/sitemap.ts`):
- Add 4 new URLs to STATIC_ROUTES array

**7d. Footer navigation** (`client/src/layouts/PublicLayout.tsx`):
- Add "Compare" and "News Fatigue" to FOOTER_NAV array
- In FOOTER_LEGAL: change `{ label: "No cookies", href: "/privacy" }` → `{ label: "No tracking", href: "/no-ads-no-tracking" }`

### Phase 8: Tests

**Shared component tests:**
- `LandingCta.test.tsx` — renders heading, description, both buttons
- `ComparisonTable.test.tsx` — renders headers/rows, highlighted column, card view toggle

**Page smoke tests (one test file per new page):**
- Renders without error
- Contains expected H1 text
- Contains internal links to other landing pages

**Methodology page test:**
- Test that new sections render (if it has an existing test, extend it)

### Phase 9: Quality Checks & Documentation

- `tsc --noEmit` — zero type errors
- Linter — zero warnings/errors
- All tests pass
- Build client — verify prerendering works for all 4 new routes
- Update CLAUDE.md with new landing pages context reference if needed

## File Summary

| Action | File |
|--------|------|
| EDIT   | `server/prisma/schema.prisma` (add region to Feed) |
| CREATE | `server/prisma/migrations/.../migration.sql` (via migrate) |
| CREATE | `server/src/routes/public/sources.ts` |
| EDIT   | `server/src/routes/public/index.ts` (mount sources route) |
| CREATE | `client/src/components/LandingCta.tsx` |
| CREATE | `client/src/components/LandingCta.test.tsx` |
| CREATE | `client/src/components/ComparisonTable.tsx` |
| CREATE | `client/src/components/ComparisonTable.test.tsx` |
| CREATE | `client/src/components/StructuredData.tsx` |
| CREATE | `client/src/pages/ComparePage.tsx` |
| CREATE | `client/src/pages/NoAdsNoTrackingPage.tsx` |
| CREATE | `client/src/pages/NewsFatiguePage.tsx` |
| CREATE | `client/src/pages/FreeApiPage.tsx` |
| EDIT   | `client/src/pages/MethodologyPage.tsx` |
| EDIT   | `client/src/App.tsx` |
| EDIT   | `client/src/routes.ts` |
| EDIT   | `client/src/layouts/PublicLayout.tsx` |
| EDIT   | `server/src/routes/public/sitemap.ts` |

## Build Sequence

1. Phase 0 (DB migration) — blocked on user running SQL in pgAdmin + stopping dev server for generate
2. Phases 1–6 (components + pages) — can proceed in parallel after Phase 0
3. Phase 7 (routing/sitemap/nav) — after pages exist
4. Phase 8 (tests) — after pages exist
5. Phase 9 (quality checks) — last

## Estimated Complexity: HIGH

- ~18 files touched
- DB migration + new API endpoint + 4 new pages + 1 enhanced page + 3 shared components
- Primary complexity: volume of content, comparison table with card view toggle, dynamic source fetching

## Status

**ALL PHASES COMPLETE.**

- 3 shared components (StructuredData, LandingCta, ComparisonTable)
- 4 new pages (ComparePage, NewsFatiguePage, NoAdsNoTrackingPage, FreeApiPage)
- 1 enhanced page (MethodologyPage) with dynamic source fetching
- Routing, sitemap, footer navigation updated
- DB migration: `FeedRegion` enum + `region` column on feeds table
- Public `GET /api/sources` endpoint (5-min cache, groups by region + issue)
- Admin feed forms: region dropdown added to create + edit
- Feed schema validation: region field in create/update schemas
- Methodology page wired to dynamic `/api/sources` endpoint with loading skeleton
- 192 client tests pass, 617 server tests pass (1 pre-existing failure)
- Build + prerendering successful for all new routes

**Remaining manual step:** Populate `region` values for existing feeds via the admin panel.
