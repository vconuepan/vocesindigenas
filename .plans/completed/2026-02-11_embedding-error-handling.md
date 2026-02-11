# Embedding Error Handling

## Problem

Embedding generation is fire-and-forget in every call site. If the OpenAI call or DB save fails, the story ends up without an embedding and nobody is notified. Stories without embeddings are invisible to semantic search, the "Related stories" section, and dedup detection.

### Affected call sites

| Location | Trigger | Current behavior |
|---|---|---|
| `story.ts:304` | Admin edits published story | `.catch(() => {})` — silent swallow |
| `story.ts:390` | Bulk publish | `.catch(() => {})` — silent swallow |
| `story.ts:891` | Single publish | `.catch(() => {})` — silent swallow |
| `analysis.ts:286` | Post-assessment (manual + auto) | `.catch(log.error)` — logged but caller unaware |
| `story.ts:309-315` | Status change to published via dropdown | **No embedding generation at all** |

### Additional bug

`titleLabel` is missing from `EMBEDDING_RELEVANT_FIELDS` (`story.ts:282`), so editing only `titleLabel` on a published story never triggers regeneration — even though `buildEmbeddingContent()` uses `titleLabel`.

---

## Design

### Principle: generate embedding BEFORE committing the state change

Every story in `analyzed`, `selected`, or `published` status must have an embedding. The embedding is generated before the status transition, not after. If embedding generation fails after 3 retries (already configured in `withRetry`), the entire operation rolls back.

### Strategy per call site

| Context | Strategy |
|---|---|
| **Assessment** (single + bulk + scheduled) | Generate embedding from LLM results before saving. If embedding fails, don't save anything — story stays `pre_analyzed`. |
| **Publish** (single) | Generate/verify embedding before publishing. If embedding fails, don't publish. Return error. |
| **Publish** (bulk / scheduled) | Generate embeddings first. Only publish stories whose embeddings succeeded. Return partial success with failure list. |
| **Admin edit** (published story) | Generate new embedding from merged fields before saving. If embedding fails, don't save the edit. Return error. |
| **Status change to published** (dropdown) | Same as single publish — generate embedding before status change. |

---

## Changes

### 1. Fix `EMBEDDING_RELEVANT_FIELDS` — add `titleLabel`

**File:** `server/src/services/story.ts:282`

```typescript
const EMBEDDING_RELEVANT_FIELDS = ['title', 'titleLabel', 'summary', 'relevanceSummary'] as const
```

### 2. New helper: `saveEmbeddingInTransaction`

**File:** `server/src/lib/vectors.ts`

Add a version of `saveEmbedding` that accepts an interactive transaction client, so we can save the embedding atomically with the story update:

```typescript
export async function saveEmbeddingTx(
  tx: Prisma.TransactionClient,
  storyId: string,
  embedding: number[],
  contentHash: string,
): Promise<void> {
  await tx.$executeRaw`
    UPDATE stories
    SET embedding = ${JSON.stringify(embedding)}::vector,
        embedding_content_hash = ${contentHash},
        embedding_generated_at = NOW()
    WHERE id = ${storyId}
  `
}
```

### 3. New helper: `generateEmbeddingForContent`

**File:** `server/src/services/embedding.ts`

Extract the "build content → hash → generate embedding" logic into a pure function that doesn't touch the DB. Returns the embedding vector + hash, or `null` if no update is needed:

```typescript
export async function generateEmbeddingForContent(
  story: Pick<StoryForEmbedding, 'title' | 'titleLabel' | 'summary' | 'embeddingContentHash'>,
): Promise<{ embedding: number[]; hash: string } | null> {
  const content = buildEmbeddingContent(story)
  if (!content) return null

  const hash = computeContentHash(content)
  if (!needsEmbeddingUpdate(story, hash)) return null

  const embedding = await generateEmbedding(content)
  return { embedding, hash }
}
```

This is the building block. Callers use it to generate the embedding before saving, then save both in a transaction.

### 4. `assessStory()` — generate embedding before saving analysis

**File:** `server/src/services/analysis.ts:247-295`

Current flow:
1. LLM analysis → get results
2. `prisma.story.update` with all fields + `status: 'analyzed'`
3. Fire-and-forget `embedAndDedup`

New flow:
1. LLM analysis → get results
2. Generate embedding from the analysis results (not from DB — the results aren't saved yet)
3. If embedding generation fails → throw, story stays `pre_analyzed`, caller sees it as an error
4. Save analysis fields + `status: 'analyzed'` + embedding atomically in a transaction
5. Run dedup (uses the now-saved embedding; can be fire-and-forget since it only reads embeddings and writes cluster data — not a critical guarantee)

```typescript
export async function assessStory(storyId: string): Promise<void> {
  // ... existing LLM analysis ...

  // Generate embedding from analysis results BEFORE saving
  const embeddingData = await generateEmbeddingForContent({
    title: parsed.relevanceTitle || null,
    titleLabel: parsed.titleLabel || null,
    summary: parsed.summary || null,
    embeddingContentHash: null, // force generation
  })

  // Save everything atomically
  await prisma.$transaction(async (tx) => {
    await tx.story.update({
      where: { id: storyId },
      data: { /* all analysis fields + status: 'analyzed' */ },
    })
    if (embeddingData) {
      await saveEmbeddingTx(tx, storyId, embeddingData.embedding, embeddingData.hash)
    }
  })

  // Dedup runs after the transaction — uses the saved embedding
  // Fire-and-forget is acceptable here: dedup is best-effort, and the embedding exists
  if (config.dedup.enabled) {
    detectAndCluster(storyId)
      .then(result => {
        if (result.clusterId) log.info({ storyId, ...result }, 'post-assessment dedup result')
      })
      .catch(err => log.error({ err, storyId }, 'post-assessment dedup failed'))
  }
}
```

If `generateEmbeddingForContent` throws (OpenAI fails after 3 retries), the whole `assessStory` call throws. `assessStories` already handles per-story errors via `Promise.allSettled` and counts them.

### 5. `publishStory()` — generate embedding before publishing

**File:** `server/src/services/story.ts:881-893`

Current flow:
1. `prisma.story.update` with published status
2. Fire-and-forget embedding

New flow:
1. Fetch current story's embedding-relevant fields
2. Generate/verify embedding (may be no-op if hash matches)
3. If embedding fails → throw, story stays unpublished
4. Publish + save embedding atomically

```typescript
export async function publishStory(id: string): Promise<Story> {
  const publishData = await preparePublishData(id)

  // Generate embedding before publishing
  const currentStory = await fetchStoryForEmbedding(id)
  if (!currentStory) throw new Error('Story not found')
  const embeddingData = await generateEmbeddingForContent(currentStory)

  // Publish + embedding atomically
  const story = await prisma.$transaction(async (tx) => {
    const updated = await tx.story.update({
      where: { id },
      data: { status: StoryStatus.published, ...publishData },
    })
    if (embeddingData) {
      await saveEmbeddingTx(tx, id, embeddingData.embedding, embeddingData.hash)
    }
    return updated
  })

  return story
}
```

If OpenAI fails → `generateEmbeddingForContent` throws → `publishStory` throws → route handler returns 500 → admin sees error toast.

### 6. `updateStoryStatus()` — add embedding generation for publish

**File:** `server/src/services/story.ts:309-315`

This function currently has NO embedding logic. Add the same generate-before-save pattern when `status === 'published'`:

```typescript
export async function updateStoryStatus(id: string, status: string): Promise<Story> {
  const data: Record<string, any> = { status: status as StoryStatus }
  if (status === 'published') {
    Object.assign(data, await preparePublishData(id))

    const currentStory = await fetchStoryForEmbedding(id)
    if (!currentStory) throw new Error('Story not found')
    const embeddingData = await generateEmbeddingForContent(currentStory)

    return prisma.$transaction(async (tx) => {
      const story = await tx.story.update({ where: { id }, data })
      if (embeddingData) {
        await saveEmbeddingTx(tx, id, embeddingData.embedding, embeddingData.hash)
      }
      return story
    })
  }
  return prisma.story.update({ where: { id }, data })
}
```

### 7. `updateStory()` — generate embedding before saving edit

**File:** `server/src/services/story.ts:284-307`

When editing a published story with embedding-relevant field changes:

1. Fetch current story's embedding fields
2. Merge with the update to compute what the new embedding content would be
3. Generate embedding from the merged content
4. If fails → throw, edit is not saved
5. Save edit + embedding atomically

```typescript
export async function updateStory(id: string, data: Record<string, any>): Promise<Story> {
  const updateData = { ...data }
  // ... existing date conversion + auto-publish logic ...

  const isPublished = /* need to check current status */
  const hasRelevantChange = EMBEDDING_RELEVANT_FIELDS.some((f) => f in updateData)

  if (isPublished && hasRelevantChange) {
    // Check current status from DB if not in updateData
    let currentStatus = updateData.status
    if (!currentStatus) {
      const existing = await prisma.story.findUnique({ where: { id }, select: { status: true } })
      currentStatus = existing?.status
    }

    if (currentStatus === 'published') {
      const currentStory = await fetchStoryForEmbedding(id)
      if (!currentStory) throw new Error('Story not found')

      // Merge current fields with updates to compute new embedding content
      const merged = {
        ...currentStory,
        ...(updateData.title !== undefined ? { title: updateData.title } : {}),
        ...(updateData.titleLabel !== undefined ? { titleLabel: updateData.titleLabel } : {}),
        ...(updateData.summary !== undefined ? { summary: updateData.summary } : {}),
      }

      const embeddingData = await generateEmbeddingForContent(merged)

      return prisma.$transaction(async (tx) => {
        const story = await tx.story.update({ where: { id }, data: updateData })
        if (embeddingData) {
          await saveEmbeddingTx(tx, id, embeddingData.embedding, embeddingData.hash)
        }
        return story
      })
    }
  }

  // Non-published or no embedding-relevant changes — simple update
  return prisma.story.update({ where: { id }, data: updateData })
}
```

If the embedding generation fails, the `updateStory` call throws. The route handler catches it and returns 500. The admin sees an error toast. Their edit is not saved.

### 8. `bulkUpdateStatus()` — generate embeddings before bulk publish

**File:** `server/src/services/story.ts:360-398`

For the `status === 'published'` branch:

1. Generate embeddings for all stories in batch
2. Separate into succeeded vs failed
3. Only publish stories with successful embeddings
4. Return which ones failed

```typescript
if (status === 'published') {
  // Generate slugs
  const storiesNeedingSlugs = await prisma.story.findMany({ ... })
  const slugMap = await generateUniqueSlugs(storiesNeedingSlugs)

  // Generate embeddings BEFORE publishing
  const embeddingResults = await batchGenerateEmbeddings(ids) // new function
  const succeeded = embeddingResults.filter(r => r.success).map(r => r.id)
  const failed = embeddingResults.filter(r => !r.success).map(r => r.id)

  if (succeeded.length === 0) {
    throw new Error('All embedding generations failed. No stories were published.')
  }

  // Only publish stories with successful embeddings
  const now = new Date()
  await prisma.$transaction([
    ...Array.from(slugMap.entries())
      .filter(([storyId]) => succeeded.includes(storyId))
      .map(([storyId, slug]) =>
        prisma.story.update({ where: { id: storyId }, data: { slug } }),
      ),
    prisma.story.updateMany({
      where: { id: { in: succeeded }, datePublished: { not: null } },
      data: { status: status as StoryStatus },
    }),
    prisma.story.updateMany({
      where: { id: { in: succeeded }, datePublished: null },
      data: { status: status as StoryStatus, datePublished: now },
    }),
  ])

  // Save embeddings (already generated, just persist)
  for (const result of embeddingResults.filter(r => r.success && r.embedding)) {
    await saveEmbedding(result.id, result.embedding!, result.hash!)
  }

  return {
    count: succeeded.length,
    ...(failed.length > 0 ? { failed, embeddingWarning: `${failed.length} story(s) not published due to embedding failure.` } : {}),
  }
}
```

This requires a new `batchGenerateEmbeddings` function in `embedding.ts` that returns per-story success/failure instead of aggregate counts.

### 9. Delete `updateStoryEmbeddingIfNeeded`

**File:** `server/src/services/embedding.ts:159-168`

This wrapper exists to swallow errors. No caller needs it anymore. Delete it.

### 10. Remove `fetchStoriesForEmbedding` published-status filter (or add new function)

**File:** `server/src/lib/vectors.ts:64-74`

`fetchStoriesForEmbedding` currently filters for `status = 'published'`. The new bulk publish flow needs to fetch stories that are still in `selected` status (they haven't been published yet). Either:
- Add a status parameter to the function, or
- Create a separate function without the filter

Prefer adding an optional status parameter.

### 11. Route handlers — surface errors and warnings

**File:** `server/src/routes/admin/stories.ts`

Since embedding failure now causes the service function to throw, the existing `catch` blocks in route handlers already return 500 errors. The error messages from the service layer are descriptive enough.

For `bulkUpdateStatus` partial failures, the response already includes the warning via the return value.

No special `_embeddingWarning` field needed — the operation either succeeds fully or fails.

### 12. Client — no changes needed for error handling

Since embedding failure now causes the API to return an error (not a success with a warning), the existing error handling in `useEditForm` and mutation hooks already shows error toasts via the `catch` block.

For bulk publish partial failures, `useBulkUpdateStatus` may want to show the warning from the response. Check if the bulk status UI handles partial success already.

### 13. Update `.context/embeddings.md`

Document:
- Generate-before-save strategy
- Which statuses guarantee an embedding exists
- Transactional embedding saves
- Dedup is still fire-and-forget (acceptable because embedding exists)

---

## Workflows

### Happy path: admin edits a published story

1. Admin edits title/summary/titleLabel, clicks Save
2. Server fetches current embedding fields, merges with updates
3. Computes new content hash → hash differs → calls OpenAI
4. OpenAI returns embedding
5. Server saves story update + new embedding in a single transaction
6. Returns updated story → client shows "Story updated" toast

### Failure path: admin edits a published story, embedding fails

1. Admin edits title, clicks Save
2. Server fetches current embedding fields, merges with updates
3. Calls OpenAI → fails → retries 3 times with exponential backoff → all fail
4. `generateEmbeddingForContent` throws
5. Transaction never runs — edit is NOT saved
6. Route handler catches error → returns 500
7. Client shows error toast: "Failed to update story"
8. Admin can retry later or investigate OpenAI status

### Happy path: single assessment (manual)

1. Admin clicks Assess on a story
2. LLM analysis runs → produces titleLabel, title, summary, etc.
3. Server generates embedding from analysis results
4. Saves analysis fields + `status: 'analyzed'` + embedding atomically
5. Runs dedup detection (fire-and-forget — embedding exists)
6. Returns assessed story → client shows success

### Failure path: single assessment, embedding fails

1. Admin clicks Assess
2. LLM analysis runs → succeeds
3. Server tries to generate embedding → OpenAI fails after retries
4. `assessStory` throws → nothing is saved, story stays `pre_analyzed`
5. Route handler returns 500 → client shows error toast
6. Story will be re-assessed on next cycle (LLM call is repeated — accepted tradeoff for data consistency)

### Happy path: scheduled assessment job

1. Scheduler triggers `assessStories([id1, id2, id3])`
2. Each story: LLM → embedding → save atomically → dedup
3. Job logs `{ completed: 3, errors: 0 }`

### Failure path: scheduled assessment, some embeddings fail

1. Scheduler triggers `assessStories([id1, id2, id3])`
2. id1: LLM → embedding → save atomically (OK)
3. id2: LLM → embedding fails → `assessStory` throws → `Promise.allSettled` catches it
4. id3: LLM → embedding → save atomically (OK)
5. Job logs `{ completed: 2, errors: 1 }` with error details
6. id2 stays `pre_analyzed` — will be re-assessed next cycle

### Happy path: single publish

1. Admin clicks Publish on a story
2. Server fetches embedding-relevant fields, generates/verifies embedding
3. Publishes + saves embedding atomically
4. Returns published story

### Failure path: single publish, embedding fails

1. Admin clicks Publish
2. Server tries to generate embedding → fails after retries
3. `publishStory` throws → story is NOT published
4. Route handler returns 500 → admin sees error toast
5. Admin can retry later

### Happy path: bulk publish

1. Admin selects 5 stories → bulk publish
2. Server generates embeddings for all 5 in batch
3. All succeed → publishes all 5 atomically
4. Returns `{ count: 5 }`

### Failure path: bulk publish, partial embedding failures

1. Admin selects 5 stories → bulk publish
2. Server generates embeddings: 3 succeed, 2 fail
3. Server publishes only the 3 with successful embeddings
4. Returns `{ count: 3, failed: ['id4', 'id5'], embeddingWarning: '2 story(s) not published due to embedding failure.' }`
5. Client shows partial success message

### Happy path: scheduled publish job

1. Scheduler triggers `bulkUpdateStatus(selectedIds, 'published')`
2. Embeddings generated for all → all published
3. Job completes normally

### Failure path: scheduled publish, partial failures

1. Scheduler triggers `bulkUpdateStatus(selectedIds, 'published')`
2. Some embeddings fail → only successful ones published
3. Failed ones stay in `selected` status → will be retried next publish cycle
4. Job logs the failures

---

## Files changed (summary)

| File | Change |
|---|---|
| `server/src/lib/vectors.ts` | Add `saveEmbeddingTx` for transactional saves, optional status param on `fetchStoriesForEmbedding` |
| `server/src/services/embedding.ts` | Add `generateEmbeddingForContent`, add `batchGenerateEmbeddings` (returns per-story results), delete `updateStoryEmbeddingIfNeeded` |
| `server/src/services/story.ts` | Fix `EMBEDDING_RELEVANT_FIELDS`, rewrite `updateStory`/`publishStory`/`updateStoryStatus`/`bulkUpdateStatus` to generate-before-save with transactions |
| `server/src/services/analysis.ts` | Rewrite `assessStory` to generate embedding before saving |
| `server/src/services/dedup.ts` | `embedAndDedup` no longer generates embedding (caller does it); simplify to just `detectAndCluster` call |
| `server/src/routes/admin/stories.ts` | Handle partial success from `bulkUpdateStatus` |
| `.context/embeddings.md` | Document new generate-before-save strategy |

## Out of scope

- **Automatic retry queue**: Failed stories stay in their previous status and are retried on the next scheduled cycle. No persistent queue needed.
- **Admin "missing embeddings" view**: The backfill script exists for mass recovery. A dashboard indicator could be useful but is a separate feature.
