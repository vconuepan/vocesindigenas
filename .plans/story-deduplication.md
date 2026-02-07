# Story Deduplication

## Goal

Detect and handle stories that cover the same event/topic across different feeds. Currently, deduplication is URL-based only — two different URLs reporting on the same event are treated as completely separate stories.

## Current State

- **URL-based dedup only:** `normalizeUrl()` in `server/src/utils/urlNormalization.ts` strips tracking params, normalizes protocol/path, then checks against DB
- **Embedding infrastructure exists:** All published stories have `text-embedding-3-small` embeddings (1536 dims, HNSW index)
- **Hybrid search works:** RRF search already combines semantic + text similarity
- **No content-level dedup:** Same event from NYT, BBC, and Reuters creates 3 separate stories that all go through the full pipeline independently

## Chosen Approach: B+D with Cluster Table + LLM Confirmation

**Decision:** Use post-analysis linking (B) + selection-time diversity (D), with:
- A **cluster table** instead of a simple `duplicateOfId` FK — supports N-way grouping naturally
- **LLM confirmation** of cluster membership — embeddings alone are too blunt for determining true duplicates; a small-model evaluation adds the editorial judgment needed

## Implementation Plan

### Phase 1: Cluster Infrastructure

#### 1. Database changes

**New table: `story_clusters`**
```prisma
model StoryCluster {
  id             String   @id @default(uuid())
  primaryStoryId String?  @unique @map("primary_story_id")
  primaryStory   Story?   @relation("ClusterPrimary", fields: [primaryStoryId], references: [id])
  stories        Story[]  @relation("ClusterMember")
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  @@map("story_clusters")
}
```

**Add to `stories` table:**
- `clusterId` (UUID, nullable, FK to `story_clusters`) — which cluster this story belongs to

This supports:
- N stories per cluster
- A designated primary story per cluster
- Stories without clusters (most stories)
- Admin override of primary selection

#### 2. Cluster detection service

**File:** `server/src/services/dedup.ts`

Two-stage detection: embedding similarity pre-filter → LLM confirmation.

```typescript
/**
 * Stage 1: Find embedding-similar candidates
 * Uses cosine similarity as a fast pre-filter (cheap, may have false positives)
 */
async function findSimilarityCandidates(storyId: string, options?: {
  threshold?: number       // cosine similarity threshold (default: 0.88 — intentionally lower since LLM will confirm)
  timeWindowDays?: number  // only check stories from last N days (default: 7)
}): Promise<{ id: string; similarity: number; title: string; summary: string }[]>

/**
 * Stage 2: LLM confirmation of duplicate status
 * Uses a small/medium model to verify whether candidates are truly about the same event
 */
async function confirmDuplicates(
  sourceStory: { title: string; summary: string },
  candidates: { id: string; title: string; summary: string }[],
): Promise<{ id: string; isDuplicate: boolean; reason: string }[]>

/**
 * Full pipeline: find candidates → LLM confirm → create/update cluster
 */
async function detectAndCluster(storyId: string): Promise<{
  clusterId: string | null
  newCluster: boolean
  memberCount: number
}>
```

#### 3. LLM confirmation prompt

**File:** `server/src/prompts/dedup.ts`

A small-model prompt that receives the source story (title + summary) and a list of candidates, then returns which candidates are true duplicates (same event/topic, not just similar theme).

```
You are evaluating whether news articles cover the same specific event or announcement.

<source>
Title: {sourceTitle}
Summary: {sourceSummary}
</source>

<candidates>
{candidates as numbered list with title + summary}
</candidates>

For each candidate, determine:
- Is it about the SAME specific event, announcement, or development as the source?
- Articles about the same broad topic but different events are NOT duplicates.

Return your assessment for each candidate.
```

**Schema:** `server/src/schemas/llm.ts`
```typescript
const dedupConfirmationSchema = z.object({
  assessments: z.array(z.object({
    candidateNumber: z.number(),
    isDuplicate: z.boolean(),
    reason: z.string(),
  }))
})
```

**Model tier:** Small (nano) — this is a simple classification task, not creative analysis.

#### 4. Cluster management logic

```typescript
async function detectAndCluster(storyId: string) {
  // 1. Find embedding-similar candidates
  const candidates = await findSimilarityCandidates(storyId)
  if (candidates.length === 0) return { clusterId: null, newCluster: false, memberCount: 0 }

  // 2. LLM confirm which are true duplicates
  const confirmed = await confirmDuplicates(story, candidates)
  const duplicateIds = confirmed.filter(c => c.isDuplicate).map(c => c.id)
  if (duplicateIds.length === 0) return { clusterId: null, newCluster: false, memberCount: 0 }

  // 3. Check if any confirmed duplicate already belongs to a cluster
  const existingCluster = await findExistingCluster(duplicateIds)

  if (existingCluster) {
    // Add source story to existing cluster
    await addToCluster(storyId, existingCluster.id)
    await updatePrimary(existingCluster.id) // re-evaluate primary
    return { clusterId: existingCluster.id, newCluster: false, memberCount: ... }
  } else {
    // Create new cluster with source + confirmed duplicates
    const cluster = await createCluster(storyId, duplicateIds)
    return { clusterId: cluster.id, newCluster: true, memberCount: duplicateIds.length + 1 }
  }
}
```

#### 5. Primary story selection

The "primary" story in a cluster is determined by:
1. **Highest relevance score** (if analyzed) — most relevant version
2. **First published** (if multiple are published) — established URL
3. **Admin override** — manual selection in admin UI

```typescript
async function updatePrimary(clusterId: string): Promise<void> {
  // Find the best story in the cluster
  // Priority: published > selected > analyzed, then by relevance DESC, then by dateCrawled ASC (oldest)
}
```

### Phase 2: Pipeline Integration

#### 6. Auto-detect after pre-assessment

In `server/src/jobs/preassessStories.ts`, after stories are pre-assessed:
- For each newly pre-assessed story, run `detectAndCluster()`
- Fire-and-forget with error logging (don't block the pipeline)

**Timing issue:** Embeddings are currently only generated on publish. For pre-assessment dedup, we need content to compare. Options:
- **Generate lightweight embeddings at pre-assessment** using `sourceTitle + summary snippet` — adds API cost but enables early detection
- **Use title + summary text similarity** as the pre-filter instead of embeddings at this stage, then refine clusters post-publish when embeddings exist
- **Defer detection to post-analysis** when richer summary data exists

**Decision needed at implementation time** — start with title-based pre-filter + LLM confirmation, add embedding refinement post-publish.

#### 7. Selection diversity (Phase D)

Before calling the selection LLM in `server/src/services/analysis.ts` → `selectStories()`:

1. Load cluster memberships for all candidate stories
2. For each cluster, keep only the primary (or highest-rated if no primary)
3. Pass the deduplicated candidate list to the selection LLM
4. After selection, if a cluster member is selected, ensure its cluster's primary is the one that gets published

### Phase 3: Admin UI

#### 8. Story table indicators

In the admin story table:
- Show a cluster icon/badge on stories that belong to a cluster
- Tooltip or expandable row shows other cluster members
- "Primary" badge on the primary story

#### 9. Cluster management panel

In the story edit panel or a dedicated admin section:
- View all stories in a cluster
- Change the primary story
- Remove a story from its cluster
- Manually create a cluster from selected stories
- Split a cluster

### Phase 4: Public-Facing (Future)

#### 10. "Also covered by" on story pages

On published story pages, if the story belongs to a cluster with other published/analyzed stories:
> "Also covered by: [Source 1](original-url), [Source 2](original-url)"

Using the `feed.displayTitle` of the other cluster members as source names.

## Configuration

Add to `server/src/config.ts`:
```typescript
dedup: {
  embeddingSimilarityThreshold: parseFloat(process.env.DEDUP_EMBEDDING_THRESHOLD || '0.88'),
  timeWindowDays: parseInt(process.env.DEDUP_TIME_WINDOW_DAYS || '7', 10),
  maxCandidates: parseInt(process.env.DEDUP_MAX_CANDIDATES || '10', 10),
  enabled: process.env.DEDUP_ENABLED !== 'false',
}
```

## Open Questions (To Resolve During Implementation)

1. **Embedding timing:** Generate embeddings at pre-assessment for better early detection? Or use title-similarity pre-filter first and refine with embeddings post-publish?
2. **Similarity threshold tuning:** 0.88 is intentionally lower than the 0.92 from the original plan, since the LLM confirmation step catches false positives. Needs tuning with real data.
3. **Should non-primary cluster members be auto-rejected?** Or just deprioritized in selection? Admin flag for review seems safest.
4. **LLM cost:** Each dedup check = 1 small-model call. With ~30 stories/day, that's ~30 extra calls. Acceptable?

## Files to Create/Modify

| File | Action |
|------|--------|
| `server/prisma/schema.prisma` | Add `StoryCluster` model, add `clusterId` to Story |
| `server/src/services/dedup.ts` | Create — detection, clustering, LLM confirmation |
| `server/src/prompts/dedup.ts` | Create — LLM dedup confirmation prompt |
| `server/src/schemas/llm.ts` | Add dedup confirmation schema |
| `server/src/services/analysis.ts` | Add pre-selection clustering diversity |
| `server/src/jobs/preassessStories.ts` | Add dedup check after pre-assessment |
| `server/src/config.ts` | Add `dedup` section |
| `client/src/pages/admin/StoriesPage.tsx` | Add cluster indicators |
| Migration SQL | Add `story_clusters` table + `cluster_id` column |

## Estimated Scope

Medium-large — new table, new service with LLM integration, pipeline integration, admin UI. ~500 lines of code.
