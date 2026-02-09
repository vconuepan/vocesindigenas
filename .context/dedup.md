# Story Deduplication

Detects and clusters stories that cover the same event across different feeds. Prevents duplicate coverage from reaching the public site and shows "Also covered by" source attribution.

## How It Works

Two-stage detection triggered after story assessment:

1. **Embedding pre-filter:** Find the top N nearest stories by cosine distance (pgvector `<=>` operator) within a configurable time window. No similarity threshold -- just the closest N.
2. **LLM confirmation:** A nano model (`gpt-5-nano`) evaluates whether candidates cover the *same specific event* (not just the same broad topic). Returns structured assessments per candidate.

## Cluster Model

Stories are grouped into clusters via `story_clusters` table:

- Each cluster has a designated **primary story** (the one shown to users)
- Non-primary members are auto-rejected
- Primary selection priority: admin override > published > highest relevance > first crawled
- A story can belong to at most one cluster

## Pipeline Position

```
fetched -> pre_analyzed -> analyzed -> [embedding + dedup] -> selected -> published
```

After `assessStories()` completes, each newly analyzed story:
1. Gets its embedding generated (via `generateStoryEmbedding`)
2. Runs through `detectAndCluster()` which finds candidates, confirms duplicates via LLM, and creates/joins clusters

## Selection Safety Net

In `selectStories()`, before passing candidates to the LLM, non-primary cluster members are filtered out. This catches edge cases where dedup hasn't run or a story was manually un-rejected.

## Admin UI

Stories that belong to a cluster show indicators in the admin panel:

- **Story table:** A "Primary" (green) or "Cluster" (purple) badge appears next to the story title
- **Edit panel:** A read-only "Cluster" section shows role (Primary/Member), member count, other members, and a "Manage cluster" link to the clusters page. Includes "Dissolve cluster" button (with confirmation). Stories not in a cluster show a "Create cluster with this story" link.
- **Clusters page** (`/admin/clusters`): Dedicated admin page listing all clusters with primary story, member count, and creation date. "New Cluster" button opens a side panel with story search to create clusters manually. Side panel supports: changing primary, removing members, merging two clusters, and dissolving. Accessible via sidebar nav. Supports `?create=storyId` URL parameter for pre-selection from edit panel.
- **Bulk actions bar:** The stories page bulk actions bar includes a "Create Cluster" button (enabled when 2+ stories selected). Opens a dialog where the admin picks the primary story, with conflict warnings for already-clustered stories.
- Cluster data is included in both list queries (`ADMIN_LIST_SELECT` includes `clusterId` + `cluster.primaryStoryId`) and detail queries (full cluster with member list)

## Manual Cluster Creation

Admins can manually create clusters from three entry points:

1. **Bulk action bar** (Stories page): Select 2+ stories, click "Create Cluster", pick primary in dialog
2. **New Cluster button** (Clusters page): Opens a side panel with story search
3. **Create cluster link** (Story edit panel): Navigates to Clusters page with story pre-selected

Manual clusters work identically to automatic clusters: non-primary members are auto-rejected, primary selection can be changed later, and all the same management actions apply. Stories already in a cluster cannot be added (returns a 409 conflict).

## "Also Covered By" (Public)

Published stories that belong to a cluster show other cluster members as source attribution:

- **API:** `GET /api/stories/:slug/cluster` returns `{ sources: [{ feedTitle, sourceUrl }] }`
- **Component:** `AlsoCoveredBy` renders below the story header metadata
- Cached for 5 minutes (HTTP and TanStack Query)

## Configuration

In `server/src/config.ts` under `dedup`:

| Key | Default | Env Var | Description |
|-----|---------|---------|-------------|
| `maxCandidates` | 10 | `DEDUP_MAX_CANDIDATES` | Number of nearest stories to fetch |
| `timeWindowDays` | 14 | `DEDUP_TIME_WINDOW_DAYS` | Only check stories from last N days |
| `enabled` | true | `DEDUP_ENABLED` | Set to `false` to disable |
| `modelTier` | small | - | LLM tier for confirmation (nano model) |

## Key Files

| File | Purpose |
|------|---------|
| `server/src/services/dedup.ts` | Core service: candidate finding, LLM confirmation, clustering, primary selection, auto-reject |
| `server/src/prompts/dedup.ts` | LLM prompt for duplicate confirmation |
| `server/src/schemas/llm.ts` | `dedupConfirmationSchema` Zod schema |
| `server/src/services/embedding.ts` | `generateStoryEmbedding()` for pre-selection embedding |
| `server/src/jobs/assessStories.ts` | Post-assessment dedup trigger |
| `server/src/services/analysis.ts` | Selection diversity safety net |
| `server/src/routes/public/stories.ts` | `/:slug/cluster` endpoint |
| `server/src/services/cluster.ts` | Cluster management: list, detail, create, search, set primary, remove member, merge, dissolve |
| `server/src/routes/admin/clusters.ts` | Admin cluster API endpoints (includes search-stories and create) |
| `server/src/schemas/cluster.ts` | Zod schemas for cluster creation and story search |
| `server/src/services/story.ts` | `getClusterMembers()`, `dissolveCluster()` (per-story) |
| `server/src/routes/admin/stories.ts` | `POST /:id/dissolve-cluster` endpoint |
| `client/src/pages/admin/ClustersPage.tsx` | Admin clusters list page |
| `client/src/components/admin/ClusterTable.tsx` | Clusters list table |
| `client/src/components/admin/ClusterDetail.tsx` | Cluster detail side panel |
| `client/src/components/admin/CreateClusterPanel.tsx` | Create cluster side panel (search + select stories) |
| `client/src/components/admin/CreateClusterDialog.tsx` | Create cluster dialog (from bulk actions) |
| `client/src/hooks/useClusters.ts` | React Query hooks for cluster CRUD |
| `client/src/components/AlsoCoveredBy.tsx` | "Also covered by" UI component |
| `client/src/components/admin/StoryTable.tsx` | `ClusterBadge` in admin story table |
| `client/src/components/admin/StoryEditForm.tsx` | Cluster section in edit panel + "Manage cluster" / "Create cluster" links |
| `client/src/hooks/usePublicStories.ts` | `useClusterMembers()` hook |
| `server/prisma/schema.prisma` | `StoryCluster` model |

## Modifying the Dedup Logic

- **Change candidate selection:** Edit `findNearestCandidates()` in `dedup.ts` -- adjust the SQL query, time window, or add distance thresholds
- **Change LLM confirmation:** Edit prompt in `prompts/dedup.ts` and schema in `schemas/llm.ts`
- **Change primary selection:** Edit `updatePrimary()` in `dedup.ts` -- modify the sort comparator
- **Change auto-reject behavior:** Edit `autoRejectNonPrimary()` in `dedup.ts`. Accepts `{ includePublished?: boolean }` option -- automatic pipeline preserves published stories, but admin-initiated actions (manual cluster creation, set primary, merge) pass `includePublished: true` to reject published non-primary members.
- **Dissolve a cluster:** `dissolveCluster()` in `story.ts` -- restores rejected members to `analyzed`, removes all `clusterId` references, deletes the cluster record

## Public URL Redirect

When a published story becomes a non-primary cluster member (e.g. after manual clustering), its public URL redirects (301) to the primary story's URL instead of returning 404:

- **Server:** `GET /api/stories/:slug` calls `getClusterRedirectSlug()` when the story is not found as published. Returns 301 redirect to `/api/stories/<primary-slug>` if the slug belongs to a non-primary cluster member whose primary is published.
- **Client:** `StoryPage` detects when the returned story's slug differs from the URL param and does a `navigate(replace: true)` to update the browser URL.
- **Service:** `getClusterRedirectSlug()` in `story.ts` looks up the story by slug (any status), checks if it's a non-primary cluster member, and returns the primary's slug if the primary is published.
