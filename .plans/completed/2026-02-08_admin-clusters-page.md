# Admin Clusters Page

## Status: Completed

## Summary

Added a dedicated admin page for managing story deduplication clusters at `/admin/clusters`.

## What Was Built

### Backend
- **Cluster service** (`server/src/services/cluster.ts`): `getAllClusters`, `getClusterById`, `setClusterPrimary`, `removeFromCluster`, `mergeClusters`, `dissolveCluster`
- **Cluster routes** (`server/src/routes/admin/clusters.ts`): GET `/`, GET `/:id`, PUT `/:id/primary`, POST `/:id/remove-member`, POST `/:id/merge`, DELETE `/:id`
- Registered in admin router index

### Frontend
- **API + hooks** (`client/src/lib/admin-api.ts`, `client/src/hooks/useClusters.ts`): Full CRUD operations with TanStack Query
- **ClusterTable** (`client/src/components/admin/ClusterTable.tsx`): Responsive table showing primary story, member count, creation date
- **ClusterDetail** (`client/src/components/admin/ClusterDetail.tsx`): Side panel with member list, change primary, remove member, merge clusters, dissolve
- **ClustersPage** (`client/src/pages/admin/ClustersPage.tsx`): Main page with table + detail panel, URL-persisted open state
- **Nav** added to AdminLayout sidebar after Stories
- **Cross-link**: "Manage cluster" link added in StoryEditForm cluster section

### Shared
- `StoryCluster` type added to `shared/types/index.ts`

### Tests
- `server/src/services/cluster.test.ts`: 10 tests for all service functions
- `server/src/routes/admin/clusters.test.ts`: 10 tests for all route endpoints

## Key Decisions
- Used `?open=CLUSTER_ID` URL param pattern (like other admin pages) to support deep-linking from StoryEditForm
- Remove-member returns `{ dissolved: true }` when cluster has too few members remaining, rather than `null`
- Merge clears `primaryStoryId` on source cluster before deletion to avoid FK constraint issues
- Reused `updatePrimary()` and `autoRejectNonPrimary()` from dedup service rather than duplicating logic

## Files Created
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

## Files Modified
| File | Change |
|------|--------|
| `shared/types/index.ts` | Added `StoryCluster` interface |
| `server/src/routes/admin/index.ts` | Registered cluster router |
| `client/src/lib/admin-api.ts` | Added clusters API section |
| `client/src/App.tsx` | Added lazy import + route |
| `client/src/layouts/AdminLayout.tsx` | Added Clusters nav item |
| `client/src/components/admin/StoryEditForm.tsx` | Added "Manage cluster" link |
| `.context/dedup.md` | Updated admin UI and key files documentation |
| `CLAUDE.md` | Updated dedup context file summary |
