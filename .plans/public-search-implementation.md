# Plan: Connect Public Search UI to Server

## Summary

Wire the existing search bar in `PublicLayout.tsx` to a real server endpoint. On submit, navigate to `/search?q=<query>` which displays results. The server searches published stories by `title` and `summary` using Prisma `contains` (case-insensitive).

## Changes

### 1. Server: Add `search` param to public story query schema

**File:** `server/src/schemas/story.ts` (line 100-104)

Add `search` field to `publicStoryQuerySchema`:
```ts
export const publicStoryQuerySchema = z.object({
  issueSlug: z.string().optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(25),
})
```

### 2. Server: Pass `search` to service in public stories route

**File:** `server/src/routes/public/stories.ts` (line 10-23)

Pass `query.search` to `getPublishedStories()`.

### 3. Server: Add search filtering to `getPublishedStories`

**File:** `server/src/services/story.ts` (line 398-432)

Add `search?: string` to the options interface. When present, add a Prisma `OR` condition matching `title` and `summary` with `contains` + `mode: 'insensitive'`.

### 4. Client: Add `search` param to public API

**File:** `client/src/lib/api.ts` (line 53-58)

Add `search?: string` to the `stories.list` params.

### 5. Client: Add `search` param to `usePublicStories` hook

**File:** `client/src/hooks/usePublicStories.ts`

Add `search?: string` to the hook params interface.

### 6. Client: Create `SearchPage` component

**File:** `client/src/pages/SearchPage.tsx` (new)

- Reads `q` from URL search params
- Calls `usePublicStories({ search: q, page, pageSize: 12 })`
- Displays results as a simple story list (reuse existing story card patterns from `IssuePage`)
- Shows "No results found" when empty
- Shows the search query in the page title

### 7. Client: Add `/search` route

**File:** `client/src/App.tsx`

Add `<Route path="/search" element={<SearchPage />} />` as a static import (public page, needed for prerendering).

### 8. Client: Wire up search form in `PublicLayout.tsx`

**File:** `client/src/layouts/PublicLayout.tsx` (line 228-263)

- On form submit, navigate to `/search?q=${encodeURIComponent(searchQuery)}`
- Remove the "Search is coming soon" placeholder text
- Use `useNavigate()` from react-router-dom

### 9. Client: Add `/search` to routes.ts

**File:** `client/src/routes.ts`

Add `{ path: '/search', priority: 0.3, changefreq: 'daily' }`.

## Verification

1. `npm run build --prefix server` - no type errors
2. `npm run test --prefix server` - existing tests pass
3. `npm run build --prefix client` - no type errors
4. `npm run test --prefix client -- --run` - existing tests pass
5. Manual: open search bar, type a query, submit. Should navigate to `/search?q=...` and show matching published stories.
