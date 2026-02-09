# Plan: Issue 6 — N+1 in Bulk Publish Slug Generation

**Improvement:** #6 from `improvements.md`
**Priority:** HIGH / Performance

## Problem

`bulkUpdateStatus()` in `story.ts:213-219` generates slugs one at a time with sequential DB queries (at least 2 per story: one `findFirst` for uniqueness, one `update` to set the slug). For N stories, this is 2N+ sequential queries.

## Approach

Batch the slug generation: pre-generate all slugs, check uniqueness in bulk, then update in a transaction.

## Steps

1. **Create `generateUniqueSlugs(stories)` helper:**
   - Generate base slugs for all stories
   - Query existing slugs matching any of the base patterns in one query
   - Resolve conflicts by appending suffixes
   - Return a `Map<storyId, slug>`

2. **Update `bulkUpdateStatus`:**
   - Use the batch slug generator
   - Wrap slug updates + status updates in a `prisma.$transaction`

3. **Add unit tests** for the batch slug generator, especially conflict resolution.

## Files Changed

- `server/src/services/story.ts` — add `generateUniqueSlugs`, update `bulkUpdateStatus`

## Risks

- Concurrent bulk publishes could still produce slug conflicts. The unique constraint on `slug` will catch this at the DB level, and we should handle `P2002` errors gracefully.
