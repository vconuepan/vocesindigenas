# Parent Issues: Include Children's Feed Titles in sourceNames

## Problem

When a parent issue's `sourceNames` are derived, only the parent's own active feeds are included. Children's feeds are excluded, so the "Our Sources" section on the public site is incomplete for parent issues.

## Solution

In `deriveSourceNames` calls for parent issues, merge the parent's own active feed titles with all children's active feed titles, deduplicate, and sort.

## Changes

### `server/src/services/issue.ts`

**`getPublicIssues()`** (line 191): Change the parent's `sourceNames` derivation from:

```ts
sourceNames: deriveSourceNames(feeds),
```

to merge children's feeds:

```ts
sourceNames: deriveSourceNames([
  ...feeds,
  ...issue.children.flatMap(c => c.feeds),
]),
```

`deriveSourceNames` already filters by `active` and sorts. Add deduplication (convert to Set) inside `deriveSourceNames` or at the call site.

**`getPublicIssueBySlug()`** (line 227): Same change — when the fetched issue is a parent (has children), merge children's feeds into the parent's sourceNames. When the issue is a child (has a parent), keep only its own feeds.

**`deriveSourceNames()`** (line 25): Add deduplication so that if a feed title appears in both parent and child, it only shows once:

```ts
function deriveSourceNames(feeds: { title: string; active: boolean }[]): string[] {
  return [...new Set(
    feeds
      .filter(f => f.active)
      .map(f => f.title)
  )].sort()
}
```

### No other files need changes

- The shared `Issue` type already has `sourceNames: string[]` — shape unchanged.
- Client pages already render `issue.sourceNames` as badges — no changes needed.
- Admin queries (`getAllIssues`, `getIssueById`) don't need this since the admin sees each issue's own feeds individually.

## Verification

1. `npm run build --prefix server` — zero errors
2. `npm run test --prefix server -- --run` — all tests pass
3. Manual check: visit `/issues` and a parent issue detail page, confirm "Our Sources" shows feeds from both the parent and its children
