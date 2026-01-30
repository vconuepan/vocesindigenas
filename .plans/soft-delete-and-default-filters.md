# Plan: Smart Soft-Delete for Feeds + Default "Hide Trashed" Filters

## Summary

Three changes:
1. **Feed delete** becomes smart: hard-delete if no stories, deactivate if stories exist
2. **Feeds page** hides inactive feeds by default (toggle to show)
3. **Stories page** excludes trashed stories by default (filter to show)

Issues stay as-is (hard-delete only).

---

## 1. Server: Feed Smart Soft-Delete

### `server/src/services/feed.ts` — `deleteFeed()`

Return `{ action: 'deleted' | 'deactivated' }` instead of throwing:

```typescript
export async function deleteFeed(id: string): Promise<{ action: 'deleted' | 'deactivated' }> {
  const storyCount = await prisma.story.count({ where: { feedId: id } })
  if (storyCount > 0) {
    await prisma.feed.update({ where: { id }, data: { active: false } })
    return { action: 'deactivated' }
  }
  await prisma.feed.delete({ where: { id } })
  return { action: 'deleted' }
}
```

### `server/src/routes/admin/feeds.ts` — DELETE handler

Return 200 with JSON body. Remove the 409 branch:

```typescript
router.delete('/:id', async (req, res) => {
  try {
    const result = await feedService.deleteFeed(req.params.id)
    const message = result.action === 'deleted'
      ? 'Feed deleted'
      : 'Feed deactivated (has linked stories)'
    res.json({ action: result.action, message })
  } catch (err: any) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Feed not found' })
      return
    }
    console.error('[feeds] Failed to delete feed:', err)
    res.status(500).json({ error: 'Failed to delete feed' })
  }
})
```

---

## 2. Server: Stories Exclude Trashed by Default

### `server/src/schemas/story.ts` — Accept `'all'` as a status value

Add `z.literal('all')` to the status field in the query schema.

### `server/src/services/story.ts` — `buildWhereClause()`

```typescript
if (filters.status === 'all') {
  // No status filter — show everything including trashed
} else if (filters.status) {
  where.status = filters.status
} else {
  // Default: exclude trashed
  where.status = { not: 'trashed' }
}
```

### `shared/types/index.ts` — `StoryFilters`

Update `status` type to accept `'all'`: `status?: StoryStatus | 'all'`

---

## 3. Client: Feeds Page Toggle

### `client/src/pages/admin/FeedsPage.tsx`

- Add `showInactive` state (default `false`)
- Pass `{ active: true }` to `useFeeds()` when `showInactive` is false
- Add toggle button in header: "Show inactive" / "Hide inactive"
- Update `handleDelete` to use `result.message` for the toast
- Update `ConfirmDialog` description to reflect smart behavior

### `client/src/lib/admin-api.ts`

Change `feeds.delete` return type from `void` to `{ action: string; message: string }`.

---

## 4. Client: Stories Filter Bar

### `client/src/components/admin/StoryFiltersBar.tsx`

- Change placeholder from `"All statuses"` to `"All (excl. trashed)"`
- Add `{ value: 'all', label: 'All (incl. trashed)' }` option to the status dropdown

---

## 5. Tests

### `server/src/routes/admin/feeds.test.ts`
- Update "deletes a feed" → expect 200 + `{ action: 'deleted' }`
- Update "409 when feed has stories" → expect 200 + `{ action: 'deactivated' }`, verify `feed.update` called

### `server/src/routes/admin/stories.test.ts`
- Add test: default GET excludes trashed stories
- Add test: `?status=trashed` returns only trashed
- Add test: `?status=all` returns everything including trashed

---

## Files to Modify

| File | Change |
|------|--------|
| `server/src/services/feed.ts` | Smart soft-delete logic |
| `server/src/routes/admin/feeds.ts` | Return 200 instead of 409 |
| `server/src/routes/admin/feeds.test.ts` | Update delete tests |
| `server/src/schemas/story.ts` | Accept `'all'` status |
| `server/src/services/story.ts` | Exclude trashed by default |
| `server/src/routes/admin/stories.test.ts` | Add default exclusion tests |
| `shared/types/index.ts` | Update `StoryFilters.status` type |
| `client/src/lib/admin-api.ts` | Update delete return type |
| `client/src/pages/admin/FeedsPage.tsx` | Toggle + toast update |
| `client/src/components/admin/StoryFiltersBar.tsx` | Placeholder + "all" option |

## Verification

1. `npm run build --prefix server && npm run test --prefix server -- --run`
2. `npm run build --prefix client && npm run test --prefix client -- --run`
3. Manual: delete a feed with stories → should deactivate, toast shows "Feed deactivated"
4. Manual: delete a feed without stories → should hard-delete, toast shows "Feed deleted"
5. Manual: feeds page loads showing only active feeds; toggle reveals inactive
6. Manual: stories page loads without trashed; selecting "All (incl. trashed)" reveals them
