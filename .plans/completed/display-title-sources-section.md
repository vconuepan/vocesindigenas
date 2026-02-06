# Use displayTitle in "Our Sources" section

## Problem

The "Our Sources" section on public issue pages shows feed `title` (internal name) instead of `displayTitle` (public-facing name). The `sourceNames` array is already dynamically derived from feeds at query time via `deriveSourceNames()` in the issue service — it just doesn't use `displayTitle` yet.

## Changes

### `server/src/services/issue.ts`

1. Update `deriveSourceNames()` signature to accept `displayTitle`:
   ```typescript
   function deriveSourceNames(feeds: { title: string; displayTitle: string | null; active: boolean }[]): string[] {
     return [...new Set(
       feeds.filter(f => f.active).map(f => f.displayTitle || f.title)
     )].sort()
   }
   ```

2. Add `displayTitle: true` to all four feed selects:
   - `getAllIssues()` (line 50-56)
   - `getIssueById()` (line 74)
   - `getPublicIssues()` (line 175, feedSelect const)
   - `getPublicIssueBySlug()` (line 208, and line 213-216 for children)

### `server/src/services/issue.test.ts`

3. Update test mocks to include `displayTitle` in feed objects and add a test case verifying `displayTitle` takes precedence over `title`.

## No migration needed

`sourceNames` has no database column — it's computed at query time from feed data.

## Verification

- `npm run build --prefix server`
- `npm run test --prefix server -- --run`
- On a public issue page, "Our Sources" should show `displayTitle` when set on a feed
