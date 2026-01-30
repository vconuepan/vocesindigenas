# Plan: Article UI Improvements

## Requirements

1. **Link to original source at the top** of the article detail page (currently at the bottom)
2. **Show source name on preview card** (StoryCard) — mention where the article came from
3. **Don't show emotion tags** on public pages (emotion mode coming later)
4. **Render markdown in story text sections** — AI-generated fields (summary, relevance reasons, caveats, scenarios) may contain markdown
5. **Don't show keywords** on the public article page

## Current State

- **StoryPage.tsx**: Full article page. Shows emotion badge, keywords, and has original link at the bottom.
- **StoryCard.tsx**: Preview card. Shows emotion badge, rating, date, and summary. No source info.
- **Shared types**: The `Story` type doesn't include `feed` info, but the public API response actually returns `feed: { title, issue: { name, slug } }`.
- All AI text sections are rendered as plain text (`<p>` tags), not markdown.

## Implementation

### Phase 1: Type updates

**File:** `shared/types/index.ts`

- Add a `PublicStory` type (or extend `Story`) that includes the feed data returned by the public API:
  ```ts
  export interface PublicStory extends Story {
    feed: {
      title: string
      issue: { name: string; slug: string }
    }
  }
  ```
- Update `client/src/lib/api.ts` to use `PublicStory` for the public API response types.

### Phase 2: StoryPage changes

**File:** `client/src/pages/StoryPage.tsx`

1. **Add source link at the top** — Below the title/metadata, add a line like:
   _"Originally published by [Source Name] — [Read original →](url)"_
   with the external link icon. Use `story.feed.title` for the source name.
2. **Remove emotion badge** — Delete the `EmotionBadge` from the header metadata row.
3. **Remove keywords section** — Delete the entire keywords rendering block (lines 119-131). Keep the `<meta>` tags in Helmet for SEO.
4. **Remove original link from bottom** — The bottom CTA is redundant since we're adding source info at the top.
5. **Render markdown** in AI text sections — Use `react-markdown` (or a lightweight alternative) for `aiSummary`, `aiRelevanceReasons`, `aiAntifactors`, `aiScenarios`, and `aiMarketingBlurb`. These fields may contain bullet lists, bold text, etc. from the LLM.

### Phase 3: StoryCard changes

**File:** `client/src/components/StoryCard.tsx`

1. **Add source name** — Show `story.feed.title` in the metadata row (e.g., as a subtle text label).
2. **Remove emotion badge** — Delete the `EmotionBadge` from the metadata row.
3. Update the component's props type from `Story` to `PublicStory`.

### Phase 4: Dependencies

- Install `react-markdown` in the client package for markdown rendering.
- Alternatively, use a simpler approach if the markdown is limited (e.g., just bold and lists) — but `react-markdown` is the standard choice and handles edge cases well.

### Phase 5: Cleanup

- Remove `EmotionBadge` import from `StoryPage.tsx` and `StoryCard.tsx` (keep the component itself — admin pages still use it).
- Verify no broken imports or unused code.

## Files Changed

| File | Changes |
|------|---------|
| `shared/types/index.ts` | Add `PublicStory` type |
| `client/src/lib/api.ts` | Use `PublicStory` for public endpoints |
| `client/src/pages/StoryPage.tsx` | Source link at top, remove emotion/keywords, markdown rendering |
| `client/src/components/StoryCard.tsx` | Add source name, remove emotion badge, use `PublicStory` |
| `client/package.json` | Add `react-markdown` dependency |

## Not Changed (intentionally)

- Admin pages (`StoryDetail.tsx`, `StoryDetailPage.tsx`, `StoryTable.tsx`) — these keep emotion tags, keywords, and all current behavior.
- `EmotionBadge.tsx` component — still used by admin.
- SEO meta tags in Helmet — keywords stay as `article:tag` meta properties.

## Risks

- **Low**: `react-markdown` adds bundle size (~15KB gzipped). Acceptable for a content-heavy page.
- **Low**: If AI fields don't actually contain markdown yet, rendering through `react-markdown` is harmless — it passes plain text through unchanged.
