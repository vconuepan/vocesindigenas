# Plan: Replace "Created" Column with Published Story Count in Issue Table

## Requirements

Replace the "Created" date column in the admin Issues table with a "Published Stories" count showing how many stories with `status = 'published'` exist for each issue (via Issue → Feed → Story relationship).

## Changes

### 1. Backend: Add published story count to `getAllIssues`

**File:** `server/src/services/issue.ts`

Update `getAllIssues()` to include a count of published stories per issue. Use Prisma's `_count` or a raw aggregation through the Feed → Story relationship:

```ts
export async function getAllIssues() {
  const issues = await prisma.issue.findMany({
    orderBy: { name: 'asc' },
    include: {
      feeds: {
        include: {
          _count: {
            select: { stories: { where: { status: 'published' } } }
          }
        }
      }
    }
  })
  // Map to flatten: sum story counts across all feeds per issue
  return issues.map(issue => ({
    ...issue,
    publishedStoryCount: issue.feeds.reduce((sum, feed) => sum + feed._count.stories, 0),
    feeds: undefined, // Don't leak feed data
  }))
}
```

Alternatively, use `prisma.$queryRaw` for a single query if the nested include doesn't support filtered counts cleanly. Will verify during implementation.

### 2. Shared types: Add `publishedStoryCount` to Issue type

**File:** `shared/types/index.ts`

Add optional `publishedStoryCount?: number` to the `Issue` interface (optional so it doesn't break other usages that don't include the count).

### 3. Frontend: Update IssueTable component

**File:** `client/src/components/admin/IssueTable.tsx`

- Remove the "Created" column header and cell
- Remove the `formatDate` import (if no longer used)
- Add a "Published" column showing `issue.publishedStoryCount ?? 0`

## Risk Assessment

- **Low risk** — This is a display-only change. The count is read-only and doesn't affect any write operations.
- The Prisma nested filtered count may need syntax verification — Prisma's `_count` with `where` on relations requires Prisma 4.3+. Will confirm the project's Prisma version.

## Files Modified

1. `server/src/services/issue.ts` — Add published story count aggregation
2. `shared/types/index.ts` — Add `publishedStoryCount` field
3. `client/src/components/admin/IssueTable.tsx` — Swap column
