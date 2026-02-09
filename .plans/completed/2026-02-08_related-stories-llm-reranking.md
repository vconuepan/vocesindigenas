# Related Stories: Cosine + LLM Re-ranking with Aggressive Caching

## Context

The initial related stories implementation (from `related-stories-link.md`) used pure cosine distance to find similar stories. Embeddings find semantic similarity but can be noisy. This enhancement adds a cheap LLM re-ranking step to pick genuinely related stories from a larger candidate pool.

## What Was Implemented

Two-stage pipeline: cosine for cheap candidate retrieval, then small LLM to judge actual relatedness based on titles. Results cached for days in-memory + long HTTP cache.

### Config — `server/src/config.ts`

Added `relatedStories` section:

```typescript
relatedStories: {
  displayCount: 4,
  candidateMultiplier: 3,  // fetch 12 candidates for 4 results
  cacheHours: 72,          // 3 days in-memory
  httpCacheSeconds: 259200, // 3 days
  modelTier: 'small',
}
```

### Schema — `server/src/schemas/llm.ts`

Added `relatedStoriesResultSchema` with `selectedIds` array and `reasoning` string.

### Prompt — `server/src/prompts/related-stories.ts` (new file)

Simple prompt: given the source story title and a numbered list of candidate titles, return the IDs of the most related ones. Uses titles and title labels only, no summaries.

### Service — `server/src/services/story.ts` (`getRelatedStories`)

Rewrote the existing function:

1. **Check in-memory cache** (`Map<slug, { ids: string[], expiry: number }>`) with periodic eviction
2. **Cache miss**:
   - Get source story title/titleLabel via raw SQL (embedding check)
   - Cosine query for `displayCount * candidateMultiplier` candidates
   - Call small LLM with `buildRelatedStoriesPrompt()` + `withStructuredOutput()`
   - Validate returned IDs against candidate pool
   - Fall back to cosine order if LLM returns no valid IDs or fails
   - Store in cache with `cacheHours` TTL
3. **Fetch full story data** for the selected IDs from Prisma
4. **Return** in LLM-selected order

Uses `getLLMByTier()` + `rateLimitDelay()` — same pattern as other LLM operations.

### Route — `server/src/routes/public/stories.ts`

Related stories endpoint uses configurable `Cache-Control: public, max-age=${config.relatedStories.httpCacheSeconds}` (3 days). Main stories list route unchanged at `max-age=60`.

## Files Modified

| File | Change |
|------|--------|
| `server/src/config.ts` | Added `relatedStories` config section |
| `server/src/schemas/llm.ts` | Added `relatedStoriesResultSchema` |
| `server/src/prompts/related-stories.ts` | **New** — prompt builder |
| `server/src/services/story.ts` | Rewrote `getRelatedStories()` with LLM re-ranking + in-memory cache |
| `server/src/routes/public/stories.ts` | Configurable cache header on related endpoint |

No client changes — the API response shape remained the same.

## Verification

- `npm run build --prefix server` — no type errors
- `npm run test --prefix server` — all 540 tests pass
- Related stories endpoint returns topically related stories, not just semantically similar ones
