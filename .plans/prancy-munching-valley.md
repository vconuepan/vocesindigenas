# Admin Clusters Page

## Context

Story deduplication creates clusters of stories covering the same event. Currently, cluster info is only visible as a badge in the story table and a read-only section in the story edit panel. Managing clusters (changing primary, removing members, merging, dissolving) requires going through individual stories. A dedicated admin page makes cluster management more direct and discoverable.

## Requirements

- New sidebar item "Clusters" in admin navigation
- Table listing all clusters with primary story, member count, creation date
- Side panel (same EditPanel pattern) for cluster detail and actions
- Actions: change primary, remove member, merge two clusters, dissolve
- Cross-link from existing story edit panel's cluster section to the clusters page

## Implementation Plan

### Phase 1: Shared Type + Backend Service

#### Step 1: Add `StoryCluster` type to shared types
**File:** `shared/types/index.ts`

```typescript
export interface StoryCluster {
  id: string
  primaryStoryId: string | null
  primaryStory?: { id: string; title: string | null; sourceTitle: string } | null
  stories: { id: string; title: string | null; sourceTitle: string; status: StoryStatus; relevance: number | null }[]
  _count: { stories: number }
  createdAt: string
  updatedAt: string
}
```

#### Step 2: Create cluster service
**File:** `server/src/services/cluster.ts` (new)

Functions:
- `getAllClusters()` — List all clusters with primary story info, member count, ordered by most recent
- `getClusterById(id)` — Single cluster with full member details (title, status, relevance, sourceTitle, feed title)
- `setClusterPrimary(clusterId, storyId)` — Override primary, run `autoRejectNonPrimary`
- `removeFromCluster(storyId)` — Remove one member, dissolve if <=1 remains, otherwise re-elect primary
- `mergeClusters(targetId, sourceId)` — Move all source members to target, re-elect primary, delete source cluster
- `dissolveCluster(clusterId)` — Restore rejected members, remove all from cluster, delete record

Reuse from `dedup.ts`: `updatePrimary()`, `autoRejectNonPrimary()`
Move `dissolveCluster` from `story.ts` to `cluster.ts` (keep re-export in story.ts for backward compat)

#### Step 3: Create cluster admin routes
**File:** `server/src/routes/admin/clusters.ts` (new)

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/` | `getAllClusters` | List all clusters |
| GET | `/:id` | `getClusterById` | Get cluster detail |
| PUT | `/:id/primary` | `setClusterPrimary` | Change primary story |
| POST | `/:id/remove-member` | `removeFromCluster` | Remove a story from cluster |
| POST | `/:id/merge` | `mergeClusters` | Merge another cluster into this one |
| DELETE | `/:id` | `dissolveCluster` | Dissolve cluster |

**File:** `server/src/routes/admin/index.ts` — Add `router.use('/clusters', clusterRouter)`

### Phase 2: Client API + Hooks

#### Step 4: Add cluster endpoints to admin API
**File:** `client/src/lib/admin-api.ts`

```typescript
clusters: {
  list: () => request<StoryCluster[]>('/clusters'),
  get: (id: string) => request<StoryCluster>(`/clusters/${id}`),
  setPrimary: (id: string, storyId: string) =>
    request<StoryCluster>(`/clusters/${id}/primary`, { method: 'PUT', body: JSON.stringify({ storyId }) }),
  removeMember: (id: string, storyId: string) =>
    request<StoryCluster | null>(`/clusters/${id}/remove-member`, { method: 'POST', body: JSON.stringify({ storyId }) }),
  merge: (targetId: string, sourceId: string) =>
    request<StoryCluster>(`/clusters/${targetId}/merge`, { method: 'POST', body: JSON.stringify({ sourceId }) }),
  dissolve: (id: string) => request<void>(`/clusters/${id}`, { method: 'DELETE' }),
},
```

#### Step 5: Create React Query hooks
**File:** `client/src/hooks/useClusters.ts` (new)

Hooks: `useClusters`, `useCluster`, `useSetClusterPrimary`, `useRemoveClusterMember`, `useMergeClusters`, `useDissolveCluster`

All mutations invalidate `['clusters']` + `['cluster', id]` + `['stories']` query keys (since cluster operations change story statuses).

### Phase 3: Admin UI Components

#### Step 6: Create ClusterTable
**File:** `client/src/components/admin/ClusterTable.tsx` (new)

Table columns:
- **Primary story title** (clickable, opens panel) — shows `primaryStory.title || primaryStory.sourceTitle`
- **Members** — count badge
- **Created** — formatted date
- **Actions** — Edit (opens panel), Dissolve (with confirm)

Follow `FeedTable.tsx` pattern: responsive columns with `hidden md:table-cell`, mobile metadata row, ActionIconButton for desktop actions, Headless UI Menu for mobile overflow.

#### Step 7: Create ClusterDetail panel
**File:** `client/src/components/admin/ClusterDetail.tsx` (new)

Side panel (EditPanel wrapper) showing:
- **Primary story** section — current primary title with option to change via dropdown
- **Members list** — each member shows: title, status badge, relevance, and action buttons:
  - "Make primary" button (if not already primary)
  - "Remove" button (with confirmation)
- **Merge section** — dropdown to select another cluster to merge into this one
- **Dissolve button** — danger action with confirmation at bottom

Uses `useCluster(id)` for data, and the mutation hooks for actions.

#### Step 8: Create ClustersPage
**File:** `client/src/pages/admin/ClustersPage.tsx` (new)

Standard page structure:
- `PageHeader` with title "Clusters" and count
- Loading/error/empty states
- `ClusterTable` for list
- `ClusterDetail` side panel
- `ConfirmDialog` for dissolve confirmation

#### Step 9: Register route and nav
**File:** `client/src/App.tsx` — Add lazy import + `<Route path="clusters" element={<ClustersPage />} />`
**File:** `client/src/layouts/AdminLayout.tsx` — Add `{ name: 'Clusters', href: '/admin/clusters', icon: Square3Stack3DIcon }` after Stories

### Phase 4: Cross-linking

#### Step 10: Link from story edit panel to clusters page
**File:** `client/src/components/admin/StoryEditForm.tsx`

In the existing cluster section, add a "View cluster" link that navigates to `/admin/clusters` and opens the cluster detail panel (via URL query param or by setting the cluster page's state). Simplest: just link to `/admin/clusters?open=CLUSTER_ID` or use a plain link to the clusters page with an anchor.

Actually simpler: just add a `<Link to={'/admin/clusters'}>Manage cluster</Link>` alongside the existing dissolve button. The clusters page will show the full list and the user can find/open the cluster from there.

### Phase 5: Tests

#### Step 11: Backend tests
**File:** `server/src/services/cluster.test.ts` (new) — Unit tests for all service functions
**File:** `server/src/routes/admin/clusters.test.ts` (new) — Route integration tests

#### Step 12: Client tests
**File:** `client/src/components/admin/ClusterTable.test.tsx` (new) — Render tests for table
**File:** `client/src/pages/admin/ClustersPage.test.tsx` (new) — Basic render test

## Verification

1. `npm run build --prefix server` — no TypeScript errors
2. `npm run build --prefix client` — no TypeScript errors
3. `npm run test --prefix server` — all tests pass
4. `npm run test --prefix client` — all tests pass
5. Manual: navigate to `/admin/clusters`, verify table loads, open panel, test actions

## Files to Create

| File | Purpose |
|------|---------|
| `server/src/services/cluster.ts` | Cluster management service |
| `server/src/routes/admin/clusters.ts` | Admin cluster API routes |
| `client/src/hooks/useClusters.ts` | React Query hooks |
| `client/src/components/admin/ClusterTable.tsx` | Cluster list table |
| `client/src/components/admin/ClusterDetail.tsx` | Cluster detail side panel |
| `client/src/pages/admin/ClustersPage.tsx` | Clusters admin page |
| `server/src/services/cluster.test.ts` | Service tests |
| `server/src/routes/admin/clusters.test.ts` | Route tests |

## Files to Modify

| File | Change |
|------|--------|
| `shared/types/index.ts` | Add `StoryCluster` interface |
| `server/src/routes/admin/index.ts` | Register cluster router |
| `client/src/lib/admin-api.ts` | Add clusters API section |
| `client/src/App.tsx` | Add lazy import + route |
| `client/src/layouts/AdminLayout.tsx` | Add Clusters nav item |
| `client/src/components/admin/StoryEditForm.tsx` | Add "Manage cluster" link |
| `.context/dedup.md` | Update admin UI documentation |
