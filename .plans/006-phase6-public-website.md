# Phase 6: Public Website (Frontend)

**Status:** Draft
**Created:** 2026-01-29
**Depends on:** Phases 0-5 (all complete)

---

## 1. Requirements Restatement

Build the public-facing website for actuallyrelevant.news. The site displays AI-curated news stories grouped by issue area, with static content pages (methodology, about, contact/imprint). It needs custom fonts (Roboto + Nexa Bold), a color scheme matching the existing brand (currently red-based in Tailwind, but the live site uses pink/magenta `#ec268f` — we'll need to decide), and full SEO/accessibility compliance.

**What exists today:**
- `PublicLayout.tsx` — minimal header/footer shell
- `HomePage.tsx` — placeholder with title/intro text
- `NotFoundPage.tsx` — 404 page
- Public API: `GET /api/stories` (paginated, filterable by `issueSlug`) and `GET /api/stories/:id`
- No public issues API endpoint yet
- Routes defined in `routes.ts`: `/`, `/methodology`, `/about`, `/contact`
- Fonts: Roboto (12 weights) + Nexa Bold/Light in `client/public/fonts/`
- Logos: `logo-no-text-square.png`, `logo-text-horizontal.png`, `logo-no-text.png`, `logo-text-square.jpg`
- Source logos for issue pages: `80000hours.png`, `futureoflife.webp`, etc. in `client/public/images/logos/`
- Static content in `.to-migrate/static-content/`: `issues.txt`, `imprint.txt`, `methodology.txt` (empty)

**What the live site (WordPress) has:**
- Color: primary `#ec268f` (pink/magenta), secondary `#661845` (deep purple)
- Fonts: Nexa (headings), Roboto (body), Lato (submenus)
- 5 issue categories: Existential Threats, Planet & Climate, Human Development, Science & Technology, (+ a 5th not in content files)
- SEO: JSON-LD structured data, OG tags, meta keywords

---

## 2. Key Decisions

### Color scheme
The current Tailwind config uses a **red** brand palette (`#991b1b` to `#fef2f2`). The live WordPress site uses **pink/magenta** (`#ec268f`). We should update the brand palette to match the live site's pink/magenta identity since this is a migration, not a redesign. The admin dashboard already uses the red palette, but that's internal — the public site should match the established brand.

**Proposed brand palette (pink/magenta):**
- `brand-500`: `#ec268f` (primary pink)
- `brand-600`: `#d41f7f`
- `brand-700`: `#b01a6a` (link color — must pass AA contrast on white)
- `brand-800`: `#661845` (secondary/deep)
- `brand-900`: `#4a1133`
- Light end (50-200): tinted pinks for backgrounds

### Fonts
- **Headings:** Nexa Bold (already in `client/public/fonts/NexaBold/`)
- **Body:** Roboto Regular/Medium/Bold (already in `client/public/fonts/Roboto/`)
- Load via `@font-face` in `index.css`, self-hosted (no Google Fonts dependency)

### Public API gaps
Need a public issues endpoint (`GET /api/issues`) to fetch issue names/slugs/descriptions for navigation and issue pages. Stories already include `issueSlug` filtering.

---

## 3. Implementation Steps

### Step 1: Font loading & color scheme update

**Files to create/modify:**
- `client/src/index.css` — Add `@font-face` declarations for Nexa Bold, Nexa Light, Roboto Regular, Roboto Medium, Roboto Bold
- `client/tailwind.config.js` — Update brand colors to pink/magenta palette; add `fontFamily` config for `nexa` and `roboto`
- `client/index.html` — Add font preload `<link>` tags for primary weights (Nexa Bold, Roboto Regular)

**Details:**
- Only preload the 2-3 most critical font files to avoid blocking render
- Use `font-display: swap` for all `@font-face` declarations
- Set body font to Roboto, heading font to Nexa Bold via Tailwind config

### Step 2: Public issues API endpoint

**Files to create/modify:**
- `server/src/routes/public/issues.ts` — New file: `GET /` (list all issues with name, slug, description) and `GET /:slug` (single issue)
- `server/src/routes/public/index.ts` — Register issues router
- `server/src/services/issue.ts` — Add `getPublicIssues()` and `getPublicIssueBySlug()` functions

**Details:**
- Return only public-safe fields (id, name, slug, description) — not prompt guidelines
- No auth required
- Rate limited (already applied to all public routes)

### Step 3: Public API client

**Files to create:**
- `client/src/lib/api.ts` — Public API client with functions: `fetchStories()`, `fetchStory()`, `fetchIssues()`, `fetchIssue()`
- `client/src/hooks/useStories.ts` — TanStack Query hook for stories (paginated, filterable by issue)
- `client/src/hooks/useIssues.ts` — TanStack Query hook for issues list and single issue

**Details:**
- Mirror the admin API client pattern from `admin-api.ts`
- Base URL from `VITE_API_URL` environment variable
- Return typed responses using shared types

### Step 4: PublicLayout redesign

**Files to modify:**
- `client/src/layouts/PublicLayout.tsx` — Full header with logo, navigation, footer with links

**Header design:**
- Logo (horizontal text version) linked to home
- Navigation links: issue categories (from API or hardcoded slugs), Methodology, About
- Mobile: hamburger menu
- Skip-to-content link for accessibility

**Footer design:**
- Site name + tagline
- Navigation links: Methodology, About, Contact/Imprint
- Copyright notice
- Dark background (matching live site's `#201e1e`)

### Step 5: Homepage

**Files to modify:**
- `client/src/pages/HomePage.tsx` — Replace placeholder with actual content

**Design:**
- Hero section: site name, tagline, brief description of the mission
- Issue sections: one section per issue with heading, 3-4 latest stories as cards, "View all" link to issue page
- Each story card: title, emotion tag badge, relevance rating, summary snippet, source name, date

**Data fetching:**
- Fetch issues list + latest stories per issue
- Use TanStack Query hooks from Step 3

### Step 6: Story detail page

**Files to create:**
- `client/src/pages/StoryPage.tsx` — Public story detail view

**Design:**
- Story title (h1)
- Meta: source, date published, emotion tag, relevance rating
- AI summary (prominent)
- Key quote (blockquote styled)
- Relevance analysis: factors, rating explanation
- "Read original article" link (prominent CTA to source URL)
- Related stories (same issue, different stories)
- Back to issue link

**Route:** `/stories/:id`

### Step 7: Issue pages

**Files to create:**
- `client/src/pages/IssuePage.tsx` — Issue detail with stories list

**Design:**
- Issue name (h1), description
- Evaluation criteria (from static content — "How we evaluate" section)
- Paginated story list (cards, same as homepage but full page)
- Sources list (from static content)
- "Make a difference" section with external links (from static content)

**Route:** `/issues/:slug`

**Static content mapping (from issues.txt):**
- `/issues/existential-threats` — Existential Threats
- `/issues/planet-climate` — Planet & Climate
- `/issues/human-development` — Human Development
- `/issues/science-technology` — Science & Technology

Note: The evaluation criteria, sources, and "make a difference" links are static content from `issues.txt`. These can be stored as a local data file in the client (e.g., `client/src/data/issues-content.ts`) since they don't change often and don't need to come from the API. The dynamic story listings come from the API.

### Step 8: Static pages

**Files to create:**
- `client/src/pages/MethodologyPage.tsx` — How relevance is assessed
- `client/src/pages/AboutPage.tsx` — About the project/mission
- `client/src/pages/ContactPage.tsx` — Contact info / imprint (from `imprint.txt`)

**Content notes:**
- `methodology.txt` is empty — we'll need to write content based on the evaluation criteria described in issues.txt and the pipeline documentation. Draft methodology content covering: what "relevant" means, the 3-criteria framework, how AI analysis works, the pipeline stages.
- `imprint.txt` has bilingual (EN/DE) legal contact info — render both sections.
- About page: write content about the mission (AI-curated news), the team/creator, and the approach.

### Step 9: Shared UI components

**Files to create:**
- `client/src/components/StoryCard.tsx` — Reusable story card (used on homepage + issue pages)
- `client/src/components/EmotionBadge.tsx` — Colored badge for emotion tags
- `client/src/components/RatingDisplay.tsx` — Visual rating display (e.g., bar or number with context)
- `client/src/components/Pagination.tsx` — Page navigation for story lists
- `client/src/components/IssueNav.tsx` — Issue category navigation (used in header)

### Step 10: SEO & meta tags

**Files to modify:**
- Every page component — Add `<Helmet>` with unique title, description, OG tags
- `client/src/routes.ts` — Add routes for `/issues/:slug` and `/stories/:id` patterns

**Structured data (JSON-LD):**
- Homepage: `WebSite` + `Organization` schema
- Story pages: `NewsArticle` schema
- Issue pages: `CollectionPage` schema

**OG tags per page:**
- `og:title`, `og:description`, `og:image` (use logo for now), `og:url`, `og:type`

### Step 11: Route registration & prerendering

**Files to modify:**
- `client/src/App.tsx` — Add all new public routes
- `client/src/routes.ts` — Add static routes for issue pages if we want them prerendered
- `client/scripts/generate-sitemap.ts` — Ensure dynamic story/issue routes are included

**New routes in App.tsx:**
```
/ → HomePage
/stories/:id → StoryPage
/issues/:slug → IssuePage
/methodology → MethodologyPage
/about → AboutPage
/contact → ContactPage
```

### Step 12: Responsive design & accessibility pass

**Across all new components/pages:**
- Mobile-first responsive design (Tailwind breakpoints)
- Touch targets: min 24x24px (44x44px preferred)
- Focus rings: `focus-visible:ring-2 focus-visible:ring-brand-500`
- Link contrast: `text-brand-700` minimum
- Semantic HTML: proper heading hierarchy, landmarks
- Skip-to-content link in layout
- All images with `alt` text
- Keyboard navigation for mobile menu

---

## 4. Implementation Order & Dependencies

```
Step 1 (fonts/colors) ─────────────────────┐
Step 2 (public issues API) ─────────────┐  │
Step 3 (API client + hooks) ◄───────────┘  │
Step 9 (shared components) ◄───────────────┘
Step 4 (layout) ◄──── Steps 1, 3, 9
Step 5 (homepage) ◄── Steps 3, 4, 9
Step 6 (story page) ◄── Steps 3, 4, 9
Step 7 (issue pages) ◄── Steps 3, 4, 9
Step 8 (static pages) ◄── Step 4
Step 10 (SEO) ◄── Steps 5-8
Step 11 (routes/prerender) ◄── Steps 5-8
Step 12 (responsive/a11y) ◄── Steps 4-8
```

**Parallel opportunities:**
- Steps 1 + 2 can run in parallel
- Steps 5, 6, 7, 8 can be built in any order after Step 4
- Steps 10, 11, 12 are cross-cutting and can be done incrementally or as a final pass

---

## 5. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| **Color palette change breaks admin** — Updating brand colors affects admin dashboard too | Medium | Scope the new pink palette to public layout only using CSS custom properties or a separate Tailwind color name (e.g., `accent` for public, keep `brand` for admin), OR accept that admin also gets the pink palette |
| **Missing methodology content** — `methodology.txt` is empty | Low | Draft content based on evaluation criteria from issues.txt and pipeline docs; mark as editable |
| **No published stories yet** — Public pages may look empty during development | Low | Show "no stories yet" states; test with seed data that includes published stories |
| **Font file sizes** — Self-hosting all 12 Roboto weights is heavy | Low | Only load Regular, Medium, Bold, and their italic variants; subset if needed later |
| **Public API performance** — Homepage fetches stories for every issue | Medium | Batch into single API call or add a dedicated homepage endpoint returning grouped stories |

---

## 6. Out of Scope

- RSS feed output (backlog)
- Newsletter subscription (backlog)
- Semantic search (backlog)
- User accounts (backlog)
- Social media meta image generation per story (future — use logo for now)
- Cookie consent / analytics (future)
