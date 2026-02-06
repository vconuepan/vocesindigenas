# Plan: Article UI — Story Page, Preview Cards, and Home Layout

## 1. StoryPage header changes (`client/src/pages/StoryPage.tsx`)

**Date row** (line 68-70): Remove the "Published"/"Found" label prefix. Just show the date:
- If `datePublished` exists: `January 30, 2026`
- If not: `January 30, 2026` (using `dateCrawled`)

**Source row** (lines 72-87): Two variants depending on whether `datePublished` exists:

- **Has `datePublished`:** "Based on an article published by [Feed Name](url) on January 30, 2026 — [Read original ↗](url)"
  - Feed name links to `story.url`
  - "Read original" also links to `story.url`
  - Date formatted as `Month Day, Year`

- **No `datePublished`:** "Based on an article by [Feed Name](url) · Crawled on January 30, 2026 — [Read original ↗](url)"
  - Feed name links to `story.url`
  - Uses `dateCrawled` with "Crawled on" prefix

Remove the separate date-only row — fold date info into the source row.

## 2. StoryCard split into two variants (`client/src/components/StoryCard.tsx`)

Add a `variant` prop: `'featured' | 'compact'`

**Both variants share:**
- Title: **never truncated** (remove `line-clamp-2`)
- Feed name linking to `story.url`
- Date: `Month Day` if current year, `Month Day, Year` if different year

**`featured` variant** (default):
- Current card layout but with full (untruncated) summary text
- Remove `line-clamp-3` from summary

**`compact` variant:**
- Title only + feed/date metadata row
- No summary text rendered

## 3. HomePage layout (`client/src/pages/HomePage.tsx`)

Keep issue sections. Within each `IssueSection`:

- Increase `pageSize` from 3 to 4 (1 featured + 3 compact)
- Sort by `dateCrawled` descending (need to pass sort param to API)
- Layout:
  - First story → `<StoryCard variant="featured" />` full width
  - Next 3 stories → `<StoryCard variant="compact" />` in a 3-column grid row

## 4. Public API sort support (`server/src/services/story.ts`, `server/src/routes/public/stories.ts`)

The public `getPublishedStories()` currently hardcodes `orderBy: { dateCrawled: 'desc' }`. This is already the desired default sort, so **no server change needed** — stories already come back newest-crawled-first.

## 5. IssuePage (`client/src/pages/IssuePage.tsx`)

Apply same card changes for consistency:
- Use `featured` variant for the first story, `compact` for the rest
- Or keep all as `featured` (showing summaries) since this is the full listing page

Decision: Keep all cards as `featured` on IssuePage since users navigated there to browse that topic in depth.

## Files changed

| File | Change |
|------|--------|
| `client/src/pages/StoryPage.tsx` | Rework header: plain date, source row with conditional date placement |
| `client/src/components/StoryCard.tsx` | Add `variant` prop, remove line clamping, conditional year in date |
| `client/src/pages/HomePage.tsx` | 4 stories per section, featured + compact layout |
| `client/src/pages/IssuePage.tsx` | Remove line clamping (all featured) |

## Verification

1. `npm run build --prefix client` — zero errors
2. `npm run test --prefix client -- --run` — all tests pass
3. Visual check: run dev server, confirm home page shows 1 large + 3 compact per issue section
