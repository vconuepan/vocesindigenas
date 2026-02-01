# Plan: Add Issue Selector to Story Edit Form ✅ COMPLETED

## Summary

Allow admins to manually set or change the issue a story belongs to via a dropdown in the story edit form. Currently, `issueId` is only set automatically during pre-assessment; there's no way to view or change it in the admin UI.

## Changes

### 1. Shared types — `shared/types/index.ts`

Add `issueId` to the `Story` interface and add `issue` relation:

```typescript
issueId: string | null
issue?: { id: string; name: string; slug: string } | null
```

### 2. Backend: Include `issue` in admin story responses — `server/src/services/story.ts`

- Add `issueId: true` and `issue: { select: { id: true, name: true, slug: true } }` to `ADMIN_LIST_SELECT`
- The `getStoryById` endpoint already uses `include: { feed: { include: { issue: true } } }` — add `issue: true` to the top-level include so it returns the direct `story.issue` alongside `story.feed.issue`

### 3. Backend: Accept `issueId` in update — `server/src/schemas/story.ts`

Add to `updateStorySchema`:

```typescript
issueId: z.string().uuid().nullable().optional(),
```

The existing `PUT /:id` route in `stories.ts` already passes the validated body to `storyService.updateStory()`, and Prisma will accept `issueId` — no route changes needed.

### 4. Backend: Update issue filter to also check `story.issueId` — `server/src/services/story.ts`

The `buildWhereClause` currently filters by `feed.issue.id`. Update it to also match stories with a direct `story.issueId`:

```typescript
if (filters.issueId) {
  where.OR = [
    { issueId: filters.issueId },
    { issue: { parentId: filters.issueId } },
    { feed: { issue: { OR: [{ id: filters.issueId }, { parentId: filters.issueId }] } } },
  ]
}
```

This way, the filter finds stories assigned to that issue directly OR through their feed.

### 5. Frontend: Add issue dropdown to `StoryEditForm` — `client/src/components/admin/StoryEditForm.tsx`

- Accept `issues: Issue[]` as a new prop (already available from `useIssues()` in `StoriesPage`)
- Add `issueId` to form state in `buildFormState()`
- Add an Issue `<Select>` dropdown using `buildIssueOptions()` (same helper used in `StoryFiltersBar`)
- Place it between the Status/Emotion row and the Pre-rating/Rating row
- Include `issueId` in `toPayload()` conversion
- Extract `buildIssueOptions()` from `StoryFiltersBar` into a shared location or duplicate inline (it's small — 15 lines)

### 6. Frontend: Thread `issues` prop through — `client/src/pages/admin/StoriesPage.tsx`, `StoryDetail.tsx`, `StoryDetailPage.tsx`

- `StoriesPage` already has `issuesQuery.data` — pass it to `StoryDetail`
- `StoryDetail` passes it through to `StoryEditForm`
- `StoryDetailPage` calls `useIssues()` and passes the data to `StoryEditForm`

### 7. Frontend: Show current issue in `StoryTable` (optional display improvement)

Display the issue name in the read-only source info section of the story edit form. Use `story.issue?.name ?? story.feed?.issue?.name ?? '—'`.

## Files Modified

| File | Change |
|------|--------|
| `shared/types/index.ts` | Add `issueId` and `issue` to `Story` |
| `server/src/services/story.ts` | Add `issueId`/`issue` to `ADMIN_LIST_SELECT`; add `issue: true` to `getStoryById` include; update issue filter in `buildWhereClause` |
| `server/src/schemas/story.ts` | Add `issueId` to `updateStorySchema` |
| `client/src/components/admin/StoryEditForm.tsx` | Add issue dropdown, accept `issues` prop |
| `client/src/components/admin/StoryDetail.tsx` | Pass `issues` prop through |
| `client/src/components/admin/StoryFiltersBar.tsx` | Export `buildIssueOptions` helper |
| `client/src/pages/admin/StoriesPage.tsx` | Pass issues to `StoryDetail` |
| `client/src/pages/admin/StoryDetailPage.tsx` | Fetch issues, pass to `StoryEditForm` |

## Verification

1. `npm run build --prefix server` — zero errors
2. `npm run build --prefix client` — zero errors
3. `npm run test --prefix server -- --run` — all tests pass
4. `npm run test --prefix client -- --run` — all tests pass
5. Manual: open story edit form, verify issue dropdown shows, change issue, save, confirm it persists
