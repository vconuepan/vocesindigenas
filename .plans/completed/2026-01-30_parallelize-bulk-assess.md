# Parallelize Bulk Assess Requests

## Problem

When bulk-assessing stories from the admin UI, requests are sent **sequentially** — a `for...of` loop in `StoriesPage.tsx:119` awaits each `adminApi.stories.assess(id)` before starting the next. This means assessing N stories takes N × (LLM time) instead of running concurrently.

## Solution

Add a concurrency-limited parallel executor (pool of 10) on the frontend. The backend already rate-limits LLM calls via `rateLimitDelay()` in `llm.ts`, so parallel HTTP requests are safe.

## Changes

### 1. Add `parallelMap` utility — `client/src/lib/async-utils.ts` (new file)

Create a generic concurrency-limited map function:

```ts
export async function parallelMap<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number,
  onProgress?: (completed: number, total: number) => void,
): Promise<{ results: R[]; errors: Array<{ item: T; error: unknown }> }>
```

- Maintains a pool of up to `concurrency` in-flight promises
- Calls `onProgress` after each item completes (success or failure)
- Returns both results and errors so callers can report succeeded/failed counts

### 2. Update bulk assess executor — `client/src/pages/admin/StoriesPage.tsx`

Replace the sequential `for...of` loop (lines 116-128) with a call to `parallelMap`:

```ts
executor: async (reportProgress) => {
  const { results, errors } = await parallelMap(
    ids,
    (id) => adminApi.stories.assess(id),
    10,
    (completed, total) => reportProgress(completed, total),
  )
  return { succeeded: results.length, failed: errors.length }
},
```

### 3. Tests — `client/src/lib/async-utils.test.ts` (new file)

Unit tests for `parallelMap`:
- Respects concurrency limit (no more than N in-flight at once)
- Reports progress correctly
- Handles mixed success/failure
- Returns all results and errors

## Files Modified

- `client/src/lib/async-utils.ts` — new utility
- `client/src/lib/async-utils.test.ts` — new tests
- `client/src/pages/admin/StoriesPage.tsx` — use `parallelMap` in assess executor

## Verification

1. `npm run test --prefix client -- --run` — all tests pass
2. `npm run build --prefix client` — builds without errors
3. Manual: select multiple stories in admin → bulk assess → observe requests fire in parallel (network tab shows 3 concurrent) with progress toast updating
