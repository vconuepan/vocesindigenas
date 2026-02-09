# Plan: Relevance Reason Card Variant ✅ DONE

## Requirements

Add a new display variation to story cards that shows the first (most important) relevance reason from the LLM analysis instead of (or alongside) the quote/summary. This adds visual variety and surfaces the "why this matters" insight directly on the homepage/issue pages.

## Current State

- **StoryCard** has 4 layout variants: `featured`, `horizontal`, `equal`, `compact`
- Cards with `featured`, `horizontal`, and `equal` variants show either a **quote** (preferred) or **summary** as secondary content
- `relevanceReasons` is a newline-separated string stored on each story (already in the public API response)
- The `parsePoints()` function in `StoryPage.tsx` handles parsing: splits on `- `/`* ` prefixes, or falls back to blank lines, or single newlines
- The hero section shows a quote or summary

## Design Decisions

1. **Which cards**: Featured and horizontal only. Equal and compact stay unchanged.
2. **Rotation**: Random per story (hash-based), so it's mixed within sections — not section-level alternation.
3. **Styling**: Just the text, no label. Regular (non-italic) text, visually distinct from the italic quoted style.
4. **Hero**: Always shows relevance reason instead of quote (when available). Falls back to quote/summary if no relevance reasons exist.

## Design Details

### Content mode: per-story hash

Instead of a section-level rotation, each story independently decides whether to show relevance or quote/summary. A simple deterministic hash of the story ID decides:

```typescript
function shouldShowRelevance(storyId: string): boolean {
  // Simple hash: sum char codes, check if odd/even (roughly 50/50)
  const hash = storyId.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0)
  return hash % 2 === 0
}
```

This means within the same section, one featured card might show a relevance reason while another shows a quote — creating natural variety. The result is stable (same story always renders the same way) and requires no external state.

A story only shows relevance mode if it actually has `relevanceReasons`. Otherwise it falls back to quote/summary.

### Visual treatment

- No "Why it matters" label — just the text
- Non-italic, regular weight, `text-neutral-600` — contrasts with the italic quoted style
- Line-clamped the same as summaries currently are
- No quotation marks (obviously)

### Hero section

The hero always attempts to show the first relevance reason. Falls back to quote → summary if no relevance reasons.

## Implementation Steps

### Step 1: Extract `parsePoints` to shared utility

Move `parsePoints()` from `StoryPage.tsx` to `client/src/lib/parse-points.ts` so both `StoryPage` and `StoryCard` can use it. Update `StoryPage.tsx` to import from the new location.

### Step 2: Add `shouldShowRelevance` helper

Create a small helper (in `StoryCard.tsx` or a utility) that hashes a story ID to decide relevance vs default content. Also add a `getFirstRelevanceReason(story)` helper that parses `relevanceReasons` and returns the first point, or `null`.

### Step 3: Update StoryCard featured/horizontal variants

In the `featured` and `horizontal` variants of `StoryCard`:
- Check `shouldShowRelevance(story.id)` and whether `getFirstRelevanceReason(story)` returns a value
- If yes: render the first relevance reason in non-italic regular style
- If no: keep current quote/summary behavior
- No changes to `equal` or `compact` variants

### Step 4: Update HeroSection

In `HomePage.tsx` `HeroSection`:
- Always try `getFirstRelevanceReason(story)` first
- Fall back to quote → summary if unavailable
- Style the relevance text as non-italic regular text (similar to the current summary style, not the quote blockquote style)

## Risks

- **Low**: Relevance reasons could be long — line-clamp handles this
- **Low**: Some stories may not have `relevanceReasons` — fallback handles this
- **Low**: Hash distribution may not be perfectly 50/50 for small sets — acceptable, it's just visual variety

## Files to Modify

1. `client/src/lib/parse-points.ts` — NEW: extracted utility
2. `client/src/pages/StoryPage.tsx` — import `parsePoints` from new location
3. `client/src/components/StoryCard.tsx` — add relevance reason rendering to featured/horizontal
4. `client/src/pages/HomePage.tsx` — update HeroSection to prefer relevance reasons

## Complexity: Low

Small surface area, no backend changes, no database changes, no new props needed on parent components.
