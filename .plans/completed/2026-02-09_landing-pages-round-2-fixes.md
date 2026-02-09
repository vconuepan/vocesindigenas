# Landing Pages Round 2 — Fixes, Redesigns, Content Corrections

## Context

After the initial SEO landing pages implementation (5 pages, 3 shared components, DB migration), the user reviewed each page and provided extensive feedback covering bugs, false claims, design issues, and content overhauls. This plan addresses all feedback in a single pass.

## Workstreams

### WS1: Bug Fixes (Cross-cutting)

**1a. CTA button unreadable** — `LandingCta.tsx:17-21`
- The `<Link>` has `bg-brand-700 text-white` but lives inside `.prose` which applies `text-brand-700` to all `<a>` tags (`index.css:59-61`), overriding the white text
- **Fix**: Move `<LandingCta>` outside the `.prose` div on all 5 pages (ComparePage, NewsFatiguePage, NoAdsNoTrackingPage, MethodologyPage). FreeApiPage already has a custom CTA section that also needs the same fix.
- Alternative: Add `[&_a]:text-inherit` to the LandingCta section to override `.prose` link styles. **Chosen approach**: Move CTAs outside `.prose` — cleaner, no CSS hacks.

**1b. Bullet list rendering** — `NoAdsNoTrackingPage.tsx:72-103`
- "What We Don't Collect" (4 items) and "What We Don't Show" (3 items) use `<p><strong>` tags, not `<ul><li>` — no bullet points visible
- **Fix**: Convert both sections to `<ul className="list-disc pl-6 space-y-2 mt-3"><li>` pattern matching the "Why This Matters" section on the same page

### WS2: Newsletter Tracking Correction

**2a. NoAdsNoTrackingPage** — Lines 85-87 claim "no email tracking". This is false — EmailOctopus tracks opens and clicks and it cannot be disabled.
- **Fix**: Replace the "No email tracking" bullet with transparent disclosure:
  > **Newsletter tracking.** Our newsletter provider (EmailOctopus) tracks email opens and link clicks. We cannot disable this. We do not use this data for profiling or advertising.
- Also update "What You Get Instead" section (line 152-153): remove "no tracking" from newsletter bullet; instead say "with an editorial digest"

**2b. PrivacyPage** — Lines 105-108 say "This data is used solely to send you updates" without mentioning tracking.
- **Fix**: Add a paragraph after line 108:
  > Our newsletter provider, EmailOctopus, automatically tracks email opens and link clicks as part of their delivery infrastructure. We cannot disable this functionality. We do not use this data for profiling, advertising, or any purpose beyond basic delivery monitoring.

**2c. FreeApiPage** — Line 95 and comparison table row (line 57) claim "no rate limits".
- **Fix**: Remove "No rate limits" from line 95, comparison table "Rate limits" row. Change to "Fair-use" or just remove the row.

### WS3: ComparePage Overhaul — `ComparePage.tsx`

**Revised categories** (was 10 rows, now 10 revised rows):
1. **AI curation** (keep, update cells with research)
2. **Topics** (renamed from "Editorial focus") — AR: "What matters to humanity: climate, development, security, science"
3. **Source transparency** (simplified) — AR: "All sources named publicly" (no count)
4. **Ads** (keep, update cells)
5. **Tracking** (keep, update cells)
6. **Story summaries** (NEW) — AR: "AI-generated summary + relevance analysis for every story"
7. **Relevance analysis** (NEW) — AR: "Multi-factor significance score with transparent methodology"
8. **Free API** (keep, remove "no rate limits" claim)
9. **RSS feeds** (keep)
10. **Methodology published** (keep)

**Dropped rows**: "Cost" and "Business model" — mention paid features inline in cells (e.g., "Bias analysis overlay (free tier + $2.49-$9.99/yr)")

**Visual enhancements to ComparisonTable component** (`ComparisonTable.tsx`):
- Support cell content as `string | { text: string; check?: boolean }` to enable green checkmarks
- Render green checkmark icon (inline SVG) before text when `check: true`
- Give AR column slightly more `min-width` for breathing room

**Competitor research**: Research was done via web searches and live site visits. Cell content will be updated with verified claims. Cannot write to `pm/` directory per project rules — research findings are embedded directly in the comparison table cells.

### WS4: NewsFatiguePage Redesign — `NewsFatiguePage.tsx`

Current: Wall of text with headings and bullet lists. Needs cards and interactive elements.

**Redesign approach**:
- "The Problem" bullet list → 4 cards in a 2x2 grid (icon + title + description). Each card has a colored left border or icon.
- "A Different Approach" 4 subsections → 4 feature cards with icons in a grid layout, styled with `bg-neutral-50 rounded-xl border p-6`
- "What Staying Informed Looks Like" → Styled numbered steps (not plain `<ol>`). Each step in a horizontal card with step number badge.
- "Built for People Who Care" → 4 issue cards in a 2x2 grid with colored top border matching issue brand colors (use `getCategoryColor` from `lib/category-colors`).
- Keep the empathetic intro text as-is (works well as prose)

### WS5: FreeApiPage Improvements — `FreeApiPage.tsx`

**5a. Remove "no rate limits" claim**: Lines 95, 57 (comparison table)
**5b. Fix curl examples**: The curl URLs use `SEO.siteUrl` which resolves to the production URL. These work with `curl` in terminal but user tried in browser and got 404. This is expected — `/api/stories` is a Render rewrite that only works for the API backend, not the static site. Add a note explaining this (e.g., "These endpoints return JSON — use curl, fetch(), or an API client. They won't render in a browser.")
**5c. Use case accordions**: Convert "Use Cases" section (5 h3 subsections) to Headless UI `Disclosure` components. Each use case becomes an expandable accordion. Import from `@headlessui/react` (already installed).
**5d. Endpoint table → styled cards**: Convert the plain table to cards per endpoint with method badge, path, and description.
**5e. Footer/navigation**: In the footer Connect column, change "API" link label to "API Docs" and add a second link "Free API" pointing to `/free-api`. On the `/developers` page, add a banner/link pointing to `/free-api` and vice versa.

### WS6: MethodologyPage Updates — `MethodologyPage.tsx`

Per user's latest message:
**6a. Collection step dynamic count**: Line 84 hardcodes "over 80". Use `sources?.totalCount` dynamically: `"We crawl ${sources?.totalCount} curated news sources..."`. Show the actual number only (no fallback text). While loading, the sentence can just omit the count or show a skeleton span.
**6b. Sources sections as accordions**: Convert "By Region" and "By Issue Area" to expandable `Disclosure` sections (collapsed by default), using Headless UI.
**6c. By Issue section**: Group all sources into 4 main issue areas only (Human Development, Planet & Climate, Existential Threats, Science & Technology). Add a note elsewhere that some areas have subcategories with adjusted evaluation criteria.
**6d. Positivity Slider wording**: Change "0–100%" to something like "five-step dial" or "5-position dial" — per user: "It's more like a dial with 5 settings."

### WS7: AboutPage Rewrite — `AboutPage.tsx`

Rewrite as "who & why" — focus on mission and origin story. Remove sections that now overlap with landing pages:
- **Current overlapping sections**: "The Problem" (→ /news-fatigue), "Our Approach" (→ /methodology), "What We Cover" (→ /methodology issue areas)
- **New structure**:
  - H1: "About Actually Relevant" (keep)
  - **The Story** — Origin story: why this was built, personal motivation
  - **Who's Behind This** — Brief: non-commercial project by [creator], not a media company
  - **What We Believe** — Core values in 3-4 short sentences
  - **Explore** — Links to the landing pages: methodology, compare, news-fatigue, no-ads-no-tracking, free-api
  - Keep the Learn More link to /imprint for contact

### WS8: NoAdsNoTrackingPage — Additional Fixes

- In "What You Get Instead" section (line 158): remove "no rate limits" from the API bullet
- Mini comparison table: no changes needed (doesn't mention rate limits)

## Files to Modify

| File | Changes |
|------|---------|
| `client/src/components/LandingCta.tsx` | No change needed (CTA itself is fine) |
| `client/src/components/ComparisonTable.tsx` | Support `check` flag on cells, render green checkmark SVG, wider AR column |
| `client/src/pages/ComparePage.tsx` | Revise all table data: new rows, drop Cost/Business model, green checkmarks, research-backed cells |
| `client/src/pages/NoAdsNoTrackingPage.tsx` | Fix bullet lists, fix newsletter tracking claim, move CTA outside `.prose`, remove "no rate limits" |
| `client/src/pages/NewsFatiguePage.tsx` | Redesign with cards, grids, styled steps; move CTA outside `.prose` |
| `client/src/pages/FreeApiPage.tsx` | Remove rate limit claims, add curl note, accordion use cases, styled endpoint cards, navigation links |
| `client/src/pages/MethodologyPage.tsx` | Dynamic source count in Collection, accordion sources sections, 4 main issues only, slider wording, move CTA outside `.prose` |
| `client/src/pages/AboutPage.tsx` | Full rewrite as "who & why" mission page |
| `client/src/pages/PrivacyPage.tsx` | Add newsletter tracking disclosure paragraph |
| `client/src/layouts/PublicLayout.tsx` | Footer: rename "API" to "API Docs", add "Free API" link |
| `client/src/pages/landing-pages.test.tsx` | Update tests for changed headings, new accordion components |

## Implementation Order

1. **WS1** — Bug fixes (CTA outside `.prose`, bullet lists) — unblocks all other work
2. **WS2** — Newsletter tracking corrections (NoAdsNoTracking, Privacy, FreeApi rate limits)
3. **WS3** — ComparisonTable component enhancement + ComparePage overhaul
4. **WS4** — NewsFatiguePage redesign with cards
5. **WS5** — FreeApiPage improvements (accordions, cards, navigation)
6. **WS6** — MethodologyPage updates (dynamic count, accordions, slider wording)
7. **WS7** — AboutPage rewrite
8. **WS8** — Test updates + type checks + build verification

## Verification

1. `npm run test --prefix client -- --run` — all tests pass
2. `npm run build --prefix client` — build succeeds, prerendering works for all routes
3. Visual check: open each page in dev, verify:
   - CTA buttons are readable (white text on brand background)
   - Bullet lists render with dots
   - Accordions expand/collapse
   - Cards layout responsive on mobile
   - Green checkmarks display in comparison table
   - No "no rate limits" claims anywhere
   - Newsletter tracking disclaimer present
