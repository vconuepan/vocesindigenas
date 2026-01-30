# Issue Page Redesign — Editorial Magazine Style

## Goal

Redesign the issue page (`IssuePage.tsx`) to feel like a magazine category page consistent with the homepage. The current page is too text-heavy with prominently displayed metadata (title, intro, RSS link, evaluation criteria, sources, make-a-difference) that pushes the actual stories — the main content — down.

## Design

### Header: Compact inline bar (not a hero block)

Replace the current full-width `bg-brand-50` hero with a compact header row:

```
[dot] HUMAN DEVELOPMENT                              [RSS icon]
One-line intro/description text (truncated if long)
```

- Category name as bold uppercase text with category color dot (matches homepage pattern)
- RSS feed link moved to a small icon-only button on the right side of the header row
- Intro text displayed as a single subtitle line beneath, not a large paragraph
- Parent breadcrumb still shown above if it's a child issue

### Sub-topics: Only show those with published stories

- Add `publishedStoryCount` to the public issue API response for children
- Filter out child issues with 0 published stories on the frontend
- Keep the pill-style links, add category color dot to each

### Stories: Magazine grid layout (main content)

Replace the current uniform 3-column grid with the homepage's editorial layout:

- **First row**: Featured story (2 cols) + 2-3 compact stories (1 col stacked) — same as homepage `IssueSection`
- **Remaining stories**: 3-column grid of compact cards
- Remove the "Latest Stories" heading — the stories ARE the page
- Remove the tagline paragraph ("We believe that every story...")
- Keep pagination at the bottom

### Supplementary content: Collapsible accordion

Move evaluation criteria, sources, and make-a-difference into a collapsible "About this issue" section at the bottom:

- Single expandable section with a disclosure toggle
- Collapsed by default — shows "About this issue ▸"
- Expanded shows all three subsections (evaluation, sources, links) in a compact layout
- Use `<details>`/`<summary>` for native accessibility

## Files to Modify

1. **`server/src/services/issue.ts`** — Add `publishedStoryCount` to `PUBLIC_ISSUE_SELECT` query for children via a count of published stories through feeds
2. **`client/src/lib/api.ts`** — Update `PublicIssue` type to include optional `publishedStoryCount` on children
3. **`client/src/pages/IssuePage.tsx`** — Complete rewrite of the page layout

## Implementation Steps

### Step 1: Backend — Add publishedStoryCount to public children

In `server/src/services/issue.ts`, modify `getPublicIssueBySlug` to include a count of published stories for each child issue. Query via `_count` on feeds→stories where status='published', similar to how the admin service does it.

### Step 2: Frontend types

Add `publishedStoryCount?: number` to the `PublicIssue` type in `client/src/lib/api.ts`.

### Step 3: Rewrite IssuePage.tsx

**Header:**
- Compact bar with category dot, uppercase name, RSS icon button (right-aligned)
- Single-line intro text below
- Parent breadcrumb if child issue

**Sub-topics (if parent issue with children):**
- Filter children to only show those with `publishedStoryCount > 0`
- Category-colored pill links

**Stories grid (main content):**
- No heading, just the stories
- First page: featured (2-col) + compact sidebar (1-col), then remaining in 3-col grid
- Subsequent pages: all cards in 3-col grid
- Pagination at bottom

**About section (bottom):**
- `<details>` element, collapsed by default
- Contains: evaluation criteria, sources, make-a-difference links
- Only rendered if at least one subsection has content

## Verification

1. `npm run build --prefix server` — no type errors
2. `npm run build --prefix client` — no type errors
3. `npm run test --prefix server -- --run` — existing tests pass
4. Visual check: navigate to an issue page and verify:
   - Compact header with category color
   - Stories displayed prominently in magazine layout
   - Subtopics only show those with stories
   - About section is collapsible
   - RSS icon is small and unobtrusive
