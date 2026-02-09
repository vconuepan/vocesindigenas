# Plan: Reclassify Action ✅ COMPLETED

## Summary

Add a "Reclassify" bulk action that re-runs issue and emotion classification on selected stories using the small LLM model. Unlike pre-assessment, it does **not** reset the relevance rating or change the story status.

## Design Decisions

- **Separate prompt** (no rating guidelines, no rating in output) — simpler, cheaper, and avoids confusing the LLM with unused instructions.
- **Separate Zod schema** (`reclassifyItemSchema` with `articleId`, `issueSlug`, `emotionTag` only).
- **Extract shared batch logic** from `preAssessStories` into a helper that both pre-assess and reclassify call, to avoid duplicating the batch orchestration, issue lookup, slug-to-id mapping, and fallback logic.
- **Uses `getSmallLLM()`** (gpt-5-nano) instead of medium.
- **Reuses existing `bulkStoryIdsSchema`** for the endpoint body validation (same shape as bulk-preassess/bulk-assess).

## Changes

### 1. LLM Schema — `server/src/schemas/llm.ts`

Add `reclassifyItemSchema` and `reclassifyResultSchema`:

```typescript
export const reclassifyItemSchema = z.object({
  articleId: z.string().describe('The article ID exactly as provided in the input'),
  issueSlug: z.string().describe('The slug of the most relevant issue from the <ISSUES> list'),
  emotionTag: z.enum(['uplifting', 'surprising', 'frustrating', 'scary', 'calm']).describe(
    'Emotion tag based on how the article affects readers. ...',
  ),
})

export const reclassifyResultSchema = z.object({
  articles: z.array(reclassifyItemSchema).describe('One entry per article in the input batch'),
})
```

### 2. Prompt — `server/src/prompts/reclassify.ts` (new file)

New prompt builder `buildReclassifyPrompt(stories, issues)` — same `<ISSUES>` and `<ARTICLES>` blocks as preassess, but the `<GOAL>` asks only for issue classification and emotion tagging (no rating guidelines section).

Export `buildReclassifyPrompt` from `server/src/prompts/index.ts`.

### 3. Analysis Service — `server/src/services/analysis.ts`

**Extract shared helper** `runBatchClassification(options)`:

```typescript
interface BatchClassificationOptions {
  storyIds: string[]
  llm: ChatOpenAI
  schema: z.ZodType
  buildPrompt: (stories: StoryForPreassess[], issues: IssueForPreassess[]) => string
  buildUpdate: (item: any, issueId: string | null) => Record<string, any>
  onProgress?: ProgressCallback
  batchSize: number
  concurrency: number
}
```

This helper encapsulates:
- Fetching stories + issues from DB
- Building `slugToId` map
- Batching stories
- Semaphore-gated LLM calls with structured output
- Issue ID resolution with feed fallback
- DB transaction for updates
- Progress reporting
- Error handling for batches

Refactor `preAssessStories` to call `runBatchClassification` with:
- `llm: getMediumLLM()`
- `schema: preAssessResultSchema`
- `buildPrompt: buildPreassessPrompt`
- `buildUpdate`: returns `{ issueId, relevancePre: item.rating, emotionTag, status: 'pre_analyzed' }`
- `batchSize: config.llm.preassessBatchSize`
- `concurrency: config.concurrency.preassess`

Add `reclassifyStories(storyIds, onProgress?)` calling `runBatchClassification` with:
- `llm: getSmallLLM()`
- `schema: reclassifyResultSchema`
- `buildPrompt: buildReclassifyPrompt`
- `buildUpdate`: returns `{ issueId, emotionTag }` (no rating, no status change)
- `batchSize: config.llm.preassessBatchSize` (reuse same batch size)
- `concurrency: config.concurrency.reclassify`

Add `bulkReclassify(storyIds, taskId)` following the existing bulk wrapper pattern.

### 4. Config — `server/src/config.ts`

Add `reclassify: parseInt(process.env.CONCURRENCY_RECLASSIFY || '10', 10)` to `concurrency`.

### 5. Shared Types — `shared/types/index.ts`

Add `'reclassify'` to `BulkTaskType`:

```typescript
export type BulkTaskType = 'preassess' | 'assess' | 'select' | 'reclassify'
```

### 6. Server Route — `server/src/routes/admin/stories.ts`

Add `POST /bulk-reclassify` endpoint (same pattern as `bulk-preassess`):

```typescript
router.post('/bulk-reclassify', expensiveOpLimiter, validateBody(bulkStoryIdsSchema), async (req, res) => {
  const { filtered, skipped } = filterProcessingIds(req.body.storyIds)
  if (filtered.length === 0) { res.status(409).json(...); return }
  const taskId = taskRegistry.create('reclassify', filtered.length, filtered)
  analysisService.bulkReclassify(filtered, taskId)
  res.status(202).json({ taskId, ...(skipped.length > 0 ? { skipped } : {}) })
})
```

### 7. Client API — `client/src/lib/admin-api.ts`

Add `bulkReclassify`:

```typescript
bulkReclassify: (storyIds: string[]) =>
  request<{ taskId: string }>('/stories/bulk-reclassify', { method: 'POST', body: JSON.stringify({ storyIds }) }),
```

### 8. Bulk Actions Bar — `client/src/components/admin/BulkActionsBar.tsx`

Add `'reclassify'` to the `onAction` type union and add a "Reclassify" button (placed after Pre-assess):

```tsx
<Button variant="secondary" size="sm" onClick={() => onAction('reclassify')} disabled={loading}>
  Reclassify
</Button>
```

### 9. Stories Page — `client/src/pages/admin/StoriesPage.tsx`

Add handler for `action === 'reclassify'` in `handleBulkAction`, following the same `setConfirmAction` + `launchPolledTask` pattern:

```typescript
} else if (action === 'reclassify') {
  setConfirmAction({
    title: `Reclassify ${ids.length} stories?`,
    description: 'This will re-run issue and emotion classification without changing ratings or status.',
    action: async () => {
      setSelectedIds(new Set())
      launchPolledTask({
        id: `reclassify-${Date.now()}`,
        label: `Reclassifying ${ids.length} stories`,
        submitFn: () => adminApi.stories.bulkReclassify(ids),
        onComplete: invalidateStories,
        storyIds: ids,
      })
    },
  })
}
```

## Files Modified

| File | Change |
|------|--------|
| `server/src/schemas/llm.ts` | Add `reclassifyItemSchema`, `reclassifyResultSchema` |
| `server/src/prompts/reclassify.ts` | New: `buildReclassifyPrompt` |
| `server/src/prompts/index.ts` | Export `buildReclassifyPrompt` |
| `server/src/services/analysis.ts` | Extract `runBatchClassification` helper; add `reclassifyStories` + `bulkReclassify` |
| `server/src/config.ts` | Add `concurrency.reclassify` |
| `shared/types/index.ts` | Add `'reclassify'` to `BulkTaskType` |
| `server/src/routes/admin/stories.ts` | Add `POST /bulk-reclassify` endpoint |
| `client/src/lib/admin-api.ts` | Add `bulkReclassify` API call |
| `client/src/components/admin/BulkActionsBar.tsx` | Add Reclassify button |
| `client/src/pages/admin/StoriesPage.tsx` | Add reclassify handler in `handleBulkAction` |

## Tests

- Unit test for `buildReclassifyPrompt` — verify it includes issues, articles, emotion tag instructions, but NO rating guidelines.
- Unit test for `reclassifyStories` — verify it updates only `issueId` and `emotionTag`, does NOT change `status` or `relevancePre`.
- Unit test for `runBatchClassification` helper — verify batch splitting, issue fallback, progress reporting.
- Existing `preAssessStories` tests updated to work with the refactored helper.

## Verification

1. `npm run build --prefix server` — zero errors
2. `npm run build --prefix client` — zero errors
3. `npm run test --prefix server -- --run` — all tests pass
4. `npm run test --prefix client -- --run` — all tests pass
5. Manual: select stories in admin, click Reclassify, verify issue/emotion updated, rating and status unchanged
