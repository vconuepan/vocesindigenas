# Plan: Expandable Assigned Stories List for Newsletters & Podcasts

## Goal

Replace the static "X stories assigned" card in newsletter/podcast detail pages with a collapsible section that shows "Assigned stories: X" with a chevron. When expanded, displays a list of story titles linking to their admin detail pages.

## Problem

Currently, `storyIds` is just an array of UUIDs — no titles. We need to fetch story titles when the section is expanded.

## Approach

**Frontend-only fetch on expand** — when the user clicks the chevron, fetch the story details client-side using the existing stories list API or a new lightweight batch endpoint. Given that newsletters/podcasts typically have 5–20 stories, a simple approach is best.

### Step 1: Add a batch stories endpoint (server)

Add `GET /api/admin/stories/batch?ids=uuid1,uuid2,...` that returns `{ id, title }[]` for the given IDs.

**Files:**
- `server/src/routes/admin/stories.ts` — add route
- `server/src/services/story.ts` — add `getStoriesByIds()` function

### Step 2: Add client API + hook

- `client/src/lib/admin-api.ts` — add `stories.batch(ids)` method
- `client/src/hooks/useNewsletters.ts` / `usePodcasts.ts` — no changes needed; we'll use a one-off query in the component

### Step 3: Create `AssignedStoriesList` component

A shared collapsible component used by both `NewsletterDetail` and `PodcastDetail`.

**Behavior:**
- Shows "Assigned stories: {count}" with a chevron icon on the right
- Clicking toggles expansion
- On first expand, fetches story titles using the batch endpoint
- Displays a list of story titles, each as a link to `/admin/stories/{id}`
- Shows loading state while fetching

**File:** `client/src/components/admin/AssignedStoriesList.tsx`

### Step 4: Update detail components

Replace the static "Assigned Stories" card in both:
- `client/src/components/admin/NewsletterDetail.tsx`
- `client/src/components/admin/PodcastDetail.tsx`

## Files to modify

| File | Change |
|------|--------|
| `server/src/services/story.ts` | Add `getStoriesByIds()` |
| `server/src/routes/admin/stories.ts` | Add `GET /stories/batch` route |
| `client/src/lib/admin-api.ts` | Add `stories.batch()` |
| `client/src/components/admin/AssignedStoriesList.tsx` | **New** — shared collapsible component |
| `client/src/components/admin/NewsletterDetail.tsx` | Use `AssignedStoriesList` |
| `client/src/components/admin/PodcastDetail.tsx` | Use `AssignedStoriesList` |

## Verification

- `npm run build --prefix server && npm run test --prefix server -- --run`
- `npm run build --prefix client && npm run test --prefix client -- --run`
- Manual: open a newsletter/podcast detail page, click the chevron, verify story titles appear as links
