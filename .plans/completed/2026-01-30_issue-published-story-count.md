# Plan: Replace "Created" Column with Published Story Count in Issue Table

## Summary

Replace the "Created" date column in the admin Issues table with a "Published Stories" count. Stories connect to issues through the Feed relation (Issue → Feed → Story), so we need to aggregate across feeds.

## Changes

### 1. Backend: `server/src/services/issue.ts`

Update `getAllIssues()` to include a count of published stories per issue using Prisma's nested `_count` with a `where` filter on story status:

```ts
export async function getAllIssues() {
  const issues = await prisma.issue.findMany({
    orderBy: { name: 'asc' },
    include: {
      feeds: {
        select: {
          _count: { select: { stories: { where: { status: 'published' } } } }
        }
      }
    }
  })
  return issues.map(({ feeds, ...issue }) => ({
    ...issue,
    publishedStoryCount: feeds.reduce((sum, f) => sum + f._count.stories, 0),
  }))
}
```

### 2. Shared types: `shared/types/index.ts`

Add `publishedStoryCount?: number` to the `Issue` interface.

### 3. Frontend: `client/src/components/admin/IssueTable.tsx`

- Replace "Created" column header with "Published"
- Replace `formatDate(issue.createdAt)` cell with `issue.publishedStoryCount ?? 0`
- Remove unused `formatDate` import

## Verification

1. `npm run build --prefix server` — builds without errors
2. `npm run build --prefix client` — builds without errors
3. `npm run test --prefix server -- --run` — all tests pass
4. `npm run test --prefix client -- --run` — all tests pass
5. Manual: Admin issues page shows story counts instead of dates
