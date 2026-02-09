# Plan: Issue 5 — `getStoriesByStatus` Loads Full Rows Unbounded

**Improvement:** #5 from `improvements.md`
**Priority:** HIGH / Performance

## Problem

`getStoriesByStatus()` returns ALL matching stories with full data including `sourceContent` (the entire article text) and joined feed/issue data. Most callers (pipeline jobs) only need story IDs. This wastes memory and bandwidth, especially with hundreds of stories.

## Approach

Create a lightweight `getStoryIdsByStatus()` for pipeline jobs, and add a limit to the full-data version.

## Steps

1. **Add `getStoryIdsByStatus()` to `services/story.ts`:**
   ```typescript
   export async function getStoryIdsByStatus(
     status: string,
     options: { ratingMin?: number; relevanceMin?: number; hoursAgo?: number; limit?: number } = {},
   ): Promise<string[]> {
     const where = buildStatusWhereClause(status, options)
     const stories = await prisma.story.findMany({
       where,
       select: { id: true },
       orderBy: { dateCrawled: 'desc' },
       ...(options.limit ? { take: options.limit } : {}),
     })
     return stories.map(s => s.id)
   }
   ```

2. **Update pipeline jobs to use the new function:**
   - `jobs/preassessStories.ts` — use `getStoryIdsByStatus('fetched')`
   - `jobs/assessStories.ts` — use `getStoryIdsByStatus('pre_analyzed', { ratingMin })`
   - `jobs/selectStories.ts` — use `getStoryIdsByStatus('analyzed', { relevanceMin })`
   - `jobs/publishStories.ts` — use `getStoryIdsByStatus('selected')`

3. **Add a default limit to `getStoriesByStatus()`** (e.g., 500) for safety.

4. **Extract shared where-clause builder** from current `getStoriesByStatus` to reuse in both functions.

## Files Changed

- `server/src/services/story.ts` — add `getStoryIdsByStatus`, refactor `getStoriesByStatus`
- `server/src/jobs/preassessStories.ts`
- `server/src/jobs/assessStories.ts`
- `server/src/jobs/selectStories.ts`
- `server/src/jobs/publishStories.ts`
- `server/src/routes/admin/stories.ts` — update preassess endpoint

## Decisions

- **Q5.1**: Create separate `getStoryIdsByStatus()` function ✓
- **Q5.2**: Add 1000-row hard limit on full-data `getStoriesByStatus()` ✓

## Risks

- Pipeline jobs that need full story data (e.g., `preAssessStories` needs `sourceContent`) will still call the full version internally via IDs. The `analysis.ts` functions fetch story data themselves, so passing only IDs is fine.
