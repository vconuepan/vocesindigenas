# Stewardship Page — `/stewardship`

## Context

The About page mentions looking for a "natural owner" and links to `/imprint`. The user wants a dedicated landing page at `/stewardship` that explains what the project is, what a steward would receive, and how to start the conversation. The spec is in `pm/artifacts/handover/stewardship-page.md`.

## Changes

### 1. Create `client/src/pages/StewardshipPage.tsx`

New page following the spec. Key sections:
- H1: "Looking for a Long-Term Home"
- Intro paragraph
- "What This Is" — prose, Coral Project external link
- "What You'd Receive" — 4 subsections (working product, complete platform, thorough documentation, low operating costs table)
- "What the Project Needs" — bullet list
- "Who We're Looking For" — prose + bullet list
- "The Tech Stack" — table
- "Let's Talk" — CTA section with heart divider (like About page), contact links

Design:
- `page-section` layout, `page-title`, `prose`, `section-heading`
- Tables: Tailwind styling consistent with other pages (ComparePage pattern)
- "Let's Talk" section: heart divider visual separator, centered contact links
- External links: `target="_blank" rel="noopener noreferrer"` + sr-only text
- Focus styles: `focus-visible:ring-2 focus-visible:ring-brand-500`
- Link color: `text-brand-700`

SEO:
- Helmet: title, description, OG tags from spec META
- StructuredData: WebPage schema + breadcrumb
- `useSources()` for dynamic source count (replacing "82+" in spec)

### 2. Update `AboutPage.tsx`

- Change "get in touch" link from `/imprint` to `/stewardship` with updated text: "learn more about stewardship"
- Add "Stewardship" to the Explore list as last item

### 3. Update `PublicLayout.tsx`

- Add `{ label: 'Stewardship', href: '/stewardship' }` to `FOOTER_NAV` array

### 4. Register route in `client/src/routes.ts`

- Add `{ path: '/stewardship', priority: 0.6, changefreq: 'monthly' }`

### 5. Register route in `server/src/routes/public/sitemap.ts`

- Add `{ path: '/stewardship', priority: 0.6, changefreq: 'monthly' }` to `STATIC_ROUTES`

### 6. Register lazy route in `client/src/App.tsx`

- Add lazy import: `const StewardshipPage = lazy(() => import('./pages/StewardshipPage'))`
- Add route: `<Route path="/stewardship" element={<LazyPage><StewardshipPage /></LazyPage>} />`

### 7. Tests

- Add StewardshipPage to `client/src/pages/landing-pages.test.tsx` (render + check h1)

### 8. Build verification

- `npm run build --prefix client` — verify prerendering works
- `npm run test --prefix client -- --run` — verify tests pass

## Files

| File | Action |
|------|--------|
| `client/src/pages/StewardshipPage.tsx` | Create |
| `client/src/pages/AboutPage.tsx` | Edit (link + explore list) |
| `client/src/layouts/PublicLayout.tsx` | Edit (footer nav) |
| `client/src/routes.ts` | Edit (add route) |
| `server/src/routes/public/sitemap.ts` | Edit (add route) |
| `client/src/App.tsx` | Edit (lazy import + route) |
| `client/src/pages/landing-pages.test.tsx` | Edit (add test) |
