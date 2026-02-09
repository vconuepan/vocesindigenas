# Manual Cluster Creation

## Goal

Allow admins to manually create story clusters from three entry points: the stories bulk action bar, the clusters page, and the story edit panel.

## Design Decisions

- **Primary selection**: User picks primary in a dialog before cluster creation
- **Auto-reject**: Non-primary members auto-rejected (same as automatic clusters)
- **Conflict handling**: Block stories already in a cluster with a warning
- **Clusters page UX**: Side panel with text search to find and select stories
- **Story edit panel**: Navigate to Clusters page with current story pre-selected
- **Search**: Text search by title only (no status/issue filters)

## Implementation

### 1. Backend: Create cluster endpoint

**File:** `server/src/routes/admin/clusters.ts`

Add `POST /clusters` endpoint:

```
Body: { storyIds: string[], primaryStoryId: string }
```

Validation:
- `storyIds` must contain 2+ story IDs
- `primaryStoryId` must be in `storyIds`
- All stories must exist
- No story can already be in a cluster (return 409 with list of conflicting stories)

Logic:
1. Create `StoryCluster` with `primaryStoryId`
2. Update all stories to set `clusterId`
3. Auto-reject non-primary members (reuse `autoRejectNonPrimary()` from `dedup.ts`)
4. Return the new cluster

**File:** `server/src/services/cluster.ts`

Add `createCluster(storyIds: string[], primaryStoryId: string)` function.

**File:** `server/src/schemas/` — Add Zod schema for the request body.

### 2. Backend: Story search endpoint

**File:** `server/src/routes/admin/stories.ts`

Add `GET /stories/search?q=<text>&limit=20` endpoint:

- Searches by title (case-insensitive `contains`)
- Returns minimal story data: `{ id, title, sourceTitle, status, relevance, clusterId }`
- Excludes trashed stories
- Limited to 20 results
- Used by the cluster creation panel to find stories

### 3. Frontend: API client + hooks

**File:** `client/src/lib/admin-api.ts`

Add:
- `clusters.create(storyIds, primaryStoryId)` — POST /clusters
- `stories.search(query)` — GET /stories/search

**File:** `client/src/hooks/useClusters.ts`

Add:
- `useCreateCluster()` mutation hook
- `useStorySearch(query)` query hook (with debounce in the component)

### 4. Frontend: Create Cluster panel (Clusters page)

**File:** `client/src/components/admin/CreateClusterPanel.tsx` (new)

Side panel (same style as `ClusterDetail`) with:

1. **Header**: "Create Cluster"
2. **Search input**: Text field with debounced search (300ms)
3. **Search results**: List of matching stories with:
   - Title + source name
   - Status badge
   - Relevance rating
   - Cluster badge if already in a cluster (disabled, with tooltip: "Already in a cluster")
   - Checkbox to select (disabled if already clustered)
4. **Selected stories section**: Shows currently selected stories with remove buttons
5. **Primary selection**: Radio buttons or star icons next to selected stories to pick the primary
6. **Validation messages**:
   - "Select at least 2 stories" (if < 2 selected)
   - "Choose a primary story" (if no primary selected)
7. **Create button**: Disabled until validation passes. On success, close panel and show the new cluster detail.

Also supports a `preSelectedStoryIds` prop for when navigating from the story edit panel.

**File:** `client/src/pages/admin/ClustersPage.tsx`

- Add "New Cluster" button in the header
- Add state to toggle between ClusterDetail and CreateClusterPanel
- Support `?create=storyId` URL parameter for pre-selection from story edit panel

### 5. Frontend: Bulk action bar integration

**File:** `client/src/components/admin/BulkActionsBar.tsx`

Add "Create Cluster" button:
- Only enabled when 2+ stories are selected
- On click: opens a dialog to pick the primary story from the selected stories
- Validates none of the selected stories are already in a cluster (show warning if any are)

**File:** `client/src/components/admin/CreateClusterDialog.tsx` (new)

Modal dialog for the bulk action flow:
1. Lists the selected stories
2. Highlights any that are already in a cluster (with warning, blocking creation)
3. Radio buttons / star icons to pick the primary
4. "Create Cluster" button
5. On success: deselect all stories, show success toast, invalidate queries

### 6. Frontend: Story edit panel integration

**File:** `client/src/components/admin/StoryEditForm.tsx`

In the section where cluster info is shown (currently only when story IS in a cluster), add an else branch:
- When the story is NOT in a cluster, show a "Create Cluster" button
- On click: navigate to `/admin/clusters?create=<storyId>`

### 7. Tests

- **Backend unit tests**: `createCluster` service function — happy path, conflict detection, primary validation
- **Backend route tests**: POST /clusters — 201, 400 (bad input), 409 (conflict)
- **Backend route tests**: GET /stories/search — search results, empty query
- **Frontend component tests**: CreateClusterPanel — search, select, primary pick, validation, conflict warning
- **Frontend component tests**: CreateClusterDialog — display, primary pick, conflict warning, submit

## File Changes Summary

| File | Change |
|------|--------|
| `server/src/services/cluster.ts` | Add `createCluster()` |
| `server/src/routes/admin/clusters.ts` | Add `POST /clusters` |
| `server/src/routes/admin/stories.ts` | Add `GET /stories/search` |
| `server/src/schemas/cluster.ts` (new) | Zod schema for create request |
| `client/src/lib/admin-api.ts` | Add `clusters.create`, `stories.search` |
| `client/src/hooks/useClusters.ts` | Add `useCreateCluster`, `useStorySearch` |
| `client/src/components/admin/CreateClusterPanel.tsx` (new) | Side panel for cluster creation |
| `client/src/components/admin/CreateClusterDialog.tsx` (new) | Dialog for bulk action flow |
| `client/src/components/admin/BulkActionsBar.tsx` | Add "Create Cluster" button |
| `client/src/pages/admin/ClustersPage.tsx` | Add "New Cluster" button, panel toggle, `?create=` param |
| `client/src/components/admin/StoryEditForm.tsx` | Add "Create Cluster" button when unclustered |
| Test files | Unit + component tests for all above |
