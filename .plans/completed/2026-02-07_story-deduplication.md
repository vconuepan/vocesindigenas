# Story Deduplication

## Goal

Detect and handle stories that cover the same event/topic across different feeds. Currently, deduplication is URL-based only — two different URLs reporting on the same event are treated as completely separate stories.

## Current State

- **URL-based dedup only:** `normalizeUrl()` in `server/src/utils/urlNormalization.ts` strips tracking params, normalizes protocol/path, then checks against DB
- **Embedding infrastructure exists:** All published stories have `text-embedding-3-small` embeddings (1536 dims, HNSW index)
- **Hybrid search works:** RRF search already combines semantic + text similarity
- **No content-level dedup:** Same event from NYT, BBC, and Reuters creates 3 separate stories that all go through the full pipeline independently

## Decisions

- **Approach:** B+D — post-analysis linking + selection-time diversity
- **Data model:** Cluster table (`story_clusters`) — supports N-way grouping
- **Validation:** Embedding pre-filter + LLM confirmation (nano model, ~$0.01/day)
- **Timing:** After full assessment (when title, summary, relevance exist), before selection. Embeddings generated at this point.
- **Candidate selection:** Top N by cosine distance (no similarity threshold) — the LLM confirmation is what filters, not the embedding score
- **Non-primary fate:** Auto-reject with reason "duplicate of [primary title]". Admins can undo.

## Pipeline Position

Today:
```
fetched → pre_analyzed → analyzed → selected → published
```

With dedup:
```
fetched → pre_analyzed → analyzed → [embedding + dedup] → selected → published
```

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

Two-stage detection: embedding proximity pre-filter → LLM confirmation.

```typescript
/**
 * Stage 1: Find the N nearest stories by cosine distance
 * No similarity threshold — just the top N closest within the time window.
 * The LLM confirmation step (stage 2) is what determines true duplicates.
 */
async function findNearestCandidates(storyId: string, options?: {
  limit?: number           // how many candidates to fetch (default: config.dedup.maxCandidates)
  timeWindowDays?: number  // only check stories from last N days (default: config.dedup.timeWindowDays)
}): Promise<{ id: string; distance: number; title: string; summary: string }[]>

/**
 * Stage 2: LLM confirmation of duplicate status
 * Uses nano model to verify whether candidates are truly about the same event
 */
async function confirmDuplicates(
  sourceStory: { title: string; summary: string },
  candidates: { id: string; title: string; summary: string }[],
): Promise<{ id: string; isDuplicate: boolean; reason: string }[]>

/**
 * Full pipeline: find candidates → LLM confirm → create/update cluster → auto-reject non-primary
 */
async function detectAndCluster(storyId: string): Promise<{
  clusterId: string | null
  newCluster: boolean
  memberCount: number
  rejectedIds: string[]
}>
```

The embedding query fetches the top N by cosine distance — no threshold cutoff:

```sql
SELECT s.id, s.title, s.summary,
       s.embedding <=> (SELECT embedding FROM stories WHERE id = $storyId) AS distance
FROM stories s
WHERE s.id != $storyId
  AND s.status IN ('analyzed', 'selected', 'published')
  AND s.embedding IS NOT NULL
  AND s.date_crawled > NOW() - INTERVAL '$timeWindowDays days'
ORDER BY distance ASC
LIMIT $maxCandidates
```

#### 3. LLM confirmation prompt

**File:** `server/src/prompts/dedup.ts`

A nano-model prompt that receives the source story (title + summary) and a list of candidates, then returns which candidates are true duplicates (same event/topic, not just similar theme).

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
  // 1. Find the N nearest stories by cosine distance
  const candidates = await findNearestCandidates(storyId)
  if (candidates.length === 0) return { clusterId: null, newCluster: false, memberCount: 0, rejectedIds: [] }

  // 2. LLM confirm which are true duplicates
  const confirmed = await confirmDuplicates(story, candidates)
  const duplicateIds = confirmed.filter(c => c.isDuplicate).map(c => c.id)
  if (duplicateIds.length === 0) return { clusterId: null, newCluster: false, memberCount: 0, rejectedIds: [] }

  // 3. Check if any confirmed duplicate already belongs to a cluster
  const existingCluster = await findExistingCluster(duplicateIds)

  if (existingCluster) {
    // Add source story to existing cluster
    await addToCluster(storyId, existingCluster.id)
    await updatePrimary(existingCluster.id)
    const rejectedIds = await autoRejectNonPrimary(existingCluster.id)
    return { clusterId: existingCluster.id, newCluster: false, memberCount: ..., rejectedIds }
  } else {
    // Create new cluster with source + confirmed duplicates
    const cluster = await createCluster(storyId, duplicateIds)
    const rejectedIds = await autoRejectNonPrimary(cluster.id)
    return { clusterId: cluster.id, newCluster: true, memberCount: duplicateIds.length + 1, rejectedIds }
  }
}
```

#### 5. Primary story selection

The primary is the story that "represents" the cluster — the one that gets selected, published, and shown on the public site.

**Selection rules, in priority order:**

1. **Admin override** — If an admin explicitly set a primary, that sticks. No automatic logic overrides it.
2. **Published story** — A story with a live URL always wins over unpublished ones. If multiple cluster members are published (edge case via admin action), the one published first wins (its URL is established).
3. **Highest relevance score** — Among unpublished assessed stories, the one the LLM rated highest.
4. **Tie-breaker: first crawled** — If relevance scores are equal, the oldest story wins.

**When does re-evaluation trigger?**

- A new story joins the cluster (might have higher relevance than current primary)
- A story in the cluster gets published (should become primary — it has a live URL)
- An admin removes the current primary from the cluster (need a new one)
- An admin explicitly sets a new primary (rule 1, no re-evaluation needed)

**What happens when the primary changes?**

- The old primary (if not published) gets auto-rejected like any other non-primary member
- The new primary (if it was auto-rejected) gets un-rejected back to `analyzed` status
- All other non-primary, non-published members stay rejected

```typescript
async function updatePrimary(clusterId: string): Promise<void> {
  const cluster = await getClusterWithMembers(clusterId)

  // Check for admin override
  if (cluster.adminOverridePrimaryId) return

  // Priority: published > highest relevance > first crawled
  const sorted = cluster.stories.sort((a, b) => {
    // Published stories first
    if (a.status === 'published' && b.status !== 'published') return -1
    if (b.status === 'published' && a.status !== 'published') return 1
    // Both published: earliest published first
    if (a.status === 'published' && b.status === 'published') {
      return (a.datePublished ?? 0) - (b.datePublished ?? 0)
    }
    // Both unpublished: highest relevance first
    if ((b.relevance ?? 0) !== (a.relevance ?? 0)) return (b.relevance ?? 0) - (a.relevance ?? 0)
    // Tie-breaker: first crawled
    return a.dateCrawled - b.dateCrawled
  })

  const newPrimary = sorted[0]
  if (newPrimary.id !== cluster.primaryStoryId) {
    await setPrimary(clusterId, newPrimary.id)
  }
}
```

#### 6. Auto-reject non-primary members

When a cluster is formed or updated, all non-primary members that haven't been published yet are auto-rejected:

```typescript
async function autoRejectNonPrimary(clusterId: string): Promise<string[]> {
  // Find all cluster members that are NOT the primary AND NOT already published
  // Set their status to 'rejected'
  // Log the rejection reason: "Duplicate of: [primary story title]"
  // Return the IDs of rejected stories
}
```

**Important:** Already-published stories are never auto-rejected (they have established URLs). If a published story joins a cluster where another published story is primary, flag for admin review instead.

### Phase 2: Pipeline Integration

#### 7. Embedding generation after assessment

Currently embeddings are generated on publish. Move embedding generation earlier:

**New trigger:** After `assessStories()` completes for a story (status changes to `analyzed`), generate its embedding. This enables dedup detection before selection.

In `server/src/services/story.ts` (or the assess job), after a story's status becomes `analyzed`:
```typescript
// Generate embedding for dedup (uses title + summary from assessment)
updateStoryEmbeddingIfNeeded(storyId).catch(() => {})
```

The existing `buildEmbeddingContent()` already uses `titleLabel + title + summary`, all of which exist after assessment.

#### 8. Auto-detect after assessment

In the assessment job (`server/src/jobs/assessStories.ts`), after stories are assessed:
- For each newly assessed story, run `detectAndCluster()`
- Fire-and-forget with error logging (don't block the pipeline)
- Rejected stories (non-primary duplicates) won't appear in the selection candidate pool

#### 9. Selection diversity (safety net)

Even with pre-selection dedup, add a safety net in `server/src/services/analysis.ts` → `selectStories()`:

1. Load cluster memberships for all candidate stories
2. For each cluster, keep only the primary (or highest-rated if no primary)
3. Pass the deduplicated candidate list to the selection LLM

This catches edge cases where dedup hasn't run yet or a story was manually un-rejected.

### Phase 3: Admin UI (Implemented)

#### 10. Story table indicators (Implemented)

In the admin story table:
- "Primary" (green) or "Cluster" (purple) badge next to story titles
- Badge is visible on both desktop and mobile views
- Uses `clusterId` + `cluster.primaryStoryId` from list query for efficient rendering

#### 11. Cluster info in edit panel (Implemented)

In the story edit panel:
- Read-only "Cluster" section after Source section
- Shows role (Primary/Member), member count
- Lists other cluster members with titles and statuses
- Full cluster data loaded via `getStoryById` include

- "Dissolve cluster" action with confirmation — restores rejected members to `analyzed`, removes all cluster references, deletes the cluster record
- Route: `POST /stories/:id/dissolve-cluster`

Note: Advanced cluster management (change primary, remove from cluster, add to cluster) was deferred to a future iteration. Current admin can manage clusters by editing story status manually.

### Phase 4: "Also Covered By" on Public Site

#### 12. API: cluster members endpoint

**Endpoint:** `GET /api/stories/:slug/cluster`

Returns the other cluster members for a published story (if any). Only returns members that have been assessed (have titles and source info).

```typescript
export async function getClusterMembers(slug: string): Promise<{
  sources: { feedTitle: string; sourceUrl: string }[]
} | null>
```

Response:
```json
{
  "sources": [
    { "feedTitle": "Reuters", "sourceUrl": "https://reuters.com/..." },
    { "feedTitle": "BBC News", "sourceUrl": "https://bbc.co.uk/..." }
  ]
}
```

Cache: `Cache-Control: public, max-age=300` (5 minutes).

#### 13. Client: "Also covered by" section on story page

**File:** `client/src/components/AlsoCoveredBy.tsx`

A small section below the story metadata (near the "Read original article" link):

```
Also covered by: Reuters, BBC News, The Guardian
```

Each source name links to its `sourceUrl` (opens in new tab). Only shown when the cluster has other members.

```tsx
export default function AlsoCoveredBy({ slug }: { slug: string }) {
  const { data } = useClusterMembers(slug)
  if (!data?.sources?.length) return null

  return (
    <p className="text-sm text-neutral-500">
      Also covered by:{' '}
      {data.sources.map((s, i) => (
        <Fragment key={s.sourceUrl}>
          {i > 0 && ', '}
          <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer"
             className="text-brand-700 hover:text-brand-800">
            {s.feedTitle}
            <span className="sr-only"> (opens in new tab)</span>
          </a>
        </Fragment>
      ))}
    </p>
  )
}
```

**Placement:** After the metadata row in `StoryPage.tsx`, only renders when cluster data exists.

**Hook:** `useClusterMembers(slug)` in `client/src/hooks/usePublicStories.ts` — TanStack Query with 5-minute stale time.

## Configuration

Add to `server/src/config.ts`:
```typescript
dedup: {
  maxCandidates: parseInt(process.env.DEDUP_MAX_CANDIDATES || '10', 10),
  timeWindowDays: parseInt(process.env.DEDUP_TIME_WINDOW_DAYS || '14', 10),
  enabled: process.env.DEDUP_ENABLED !== 'false',
}
```

No similarity threshold — we fetch the top N by distance and let the LLM decide.

## Remaining Implementation-Time Decisions

1. **Distance sanity check:** Even without a hard threshold, we might want to skip the LLM call if the nearest candidate is very far (e.g., distance > 0.5). This avoids wasting a nano call when candidates are clearly unrelated. Tune with real data.
2. **Cluster merging:** If two separate clusters are later found to be about the same event, how to merge them? Manual admin action initially, automated later.

## Files to Create/Modify

| File | Action |
|------|--------|
| `server/prisma/schema.prisma` | Add `StoryCluster` model, add `clusterId` to Story |
| `server/src/services/dedup.ts` | Create — detection, clustering, LLM confirmation, auto-reject |
| `server/src/prompts/dedup.ts` | Create — LLM dedup confirmation prompt |
| `server/src/schemas/llm.ts` | Add dedup confirmation schema |
| `server/src/services/analysis.ts` | Add pre-selection clustering diversity (safety net) |
| `server/src/services/story.ts` | Trigger embedding generation after assessment |
| `server/src/jobs/assessStories.ts` | Add dedup check after assessment |
| `server/src/config.ts` | Add `dedup` section |
| `server/src/routes/public/stories.ts` | Add `/:slug/cluster` endpoint |
| `server/src/services/story.ts` | Add `getClusterMembers()` |
| `client/src/components/AlsoCoveredBy.tsx` | Create — "Also covered by" section |
| `client/src/hooks/usePublicStories.ts` | Add `useClusterMembers()` hook |
| `client/src/pages/StoryPage.tsx` | Add AlsoCoveredBy component |
| `client/src/pages/admin/StoriesPage.tsx` | Add cluster indicators + management |
| Migration SQL | Add `story_clusters` table + `cluster_id` column + index |

## Estimated Scope

Medium-large — new table, new service with LLM integration, pipeline integration, admin UI, public display. ~600 lines of code.
