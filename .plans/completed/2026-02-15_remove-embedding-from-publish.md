# Remove Embedding Generation from Publish Step

## Problem

Embeddings are already generated during the assess step (before a story reaches `analyzed`). The publish step redundantly generates embeddings again. This was originally needed because publish was the first step that required embeddings, but now that dedup runs after assessment, embeddings are guaranteed to exist by the time a story reaches `selected`.

The publish step should not redundantly generate embeddings. Instead, a shared `ensureEmbedding(id)` utility checks if an embedding exists and generates one only if missing. This handles the edge case where an admin manually publishes an unassessed story, without duplicating embedding logic.

## Current Behavior

Embedding generation happens in **four** places for the publish flow:

1. `publishStory()` (`story.ts:969-990`) — single story publish
2. `updateStoryStatus()` (`story.ts:346-365`) — admin status change
3. `bulkUpdateStatus()` (`story.ts:410-469`) — bulk publish job
4. `updateStory()` (`story.ts:313-343`) — edit of published story (regenerates if content changed)

Items 1-3 should be replaced with the shared `ensureEmbedding` utility. Item 4 (edit regeneration) should stay — it handles content changes after initial publish.

## Changes

### 0. `server/src/services/embedding.ts` — New `ensureEmbedding()` utility

Extract a shared function that checks if an embedding exists and generates one if missing:

```typescript
/**
 * Ensure a story has an embedding. If one already exists (and content hasn't
 * changed), this is a no-op. If missing, generates and persists one.
 * Used as a safety net when publishing stories that may not have been assessed.
 */
export async function ensureEmbedding(storyId: string): Promise<void> {
  const story = await fetchStoryForEmbedding(storyId)
  if (!story) return

  const embeddingData = await generateEmbeddingForContent(story)
  if (embeddingData) {
    await saveEmbedding(storyId, embeddingData.embedding, embeddingData.hash)
  }
}

/**
 * Batch version: ensures embeddings exist for multiple stories.
 * Skips stories that already have up-to-date embeddings.
 */
export async function ensureEmbeddings(storyIds: string[]): Promise<void> {
  const results = await batchGenerateEmbeddings(storyIds, 'any')
  // batchGenerateEmbeddings already skips stories with matching content hash
  // and persists new embeddings. Just log failures.
  const failed = results.filter(r => !r.success)
  if (failed.length > 0) {
    log.warn({ failedCount: failed.length }, 'some embeddings failed during ensure')
  }
}
```

This reuses the existing `generateEmbeddingForContent` and `batchGenerateEmbeddings` — no duplication. The content hash check inside those functions already prevents regenerating when the embedding is current.

### 1. `server/src/services/story.ts` — `publishStory()`

**After:**
```typescript
export async function publishStory(id: string): Promise<Story> {
  const publishData = await preparePublishData(id)
  await ensureEmbedding(id)
  return prisma.story.update({
    where: { id },
    data: { status: StoryStatus.published, ...publishData },
  })
}
```

Simple: ensure embedding exists (no-op for assessed stories), then update status. No transaction needed.

### 2. `server/src/services/story.ts` — `updateStoryStatus()`

**After:**
```typescript
export async function updateStoryStatus(id: string, status: string): Promise<Story> {
  const data: Record<string, any> = { status: status as StoryStatus }
  if (status === 'published') {
    Object.assign(data, await preparePublishData(id))
    await ensureEmbedding(id)
  }
  return prisma.story.update({ where: { id }, data })
}
```

### 3. `server/src/services/story.ts` — `bulkUpdateStatus()`

**After:**
```typescript
if (status === 'published') {
  const storiesNeedingSlugs = await prisma.story.findMany({
    where: { id: { in: ids }, slug: null },
    select: { id: true, title: true, sourceTitle: true },
  })
  const slugMap = await generateUniqueSlugs(storiesNeedingSlugs)

  // Ensure all stories have embeddings (no-op for already-embedded stories)
  await ensureEmbeddings(ids)

  const now = new Date()
  await prisma.$transaction(async (tx) => {
    for (const [storyId, slug] of slugMap.entries()) {
      await tx.story.update({ where: { id: storyId }, data: { slug } })
    }
    await tx.story.updateMany({
      where: { id: { in: ids }, datePublished: { not: null } },
      data: { status: status as StoryStatus },
    })
    await tx.story.updateMany({
      where: { id: { in: ids }, datePublished: null },
      data: { status: status as StoryStatus, datePublished: now },
    })
  })
  return { count: ids.length }
}
```

No more `embeddingWarning` or `failed` filtering — `ensureEmbeddings` is best-effort (warns on failure but doesn't block publish).

### 4. `server/src/services/story.ts` — `updateStory()` (edit)

**Keep as-is.** The embedding regeneration on content edit is still needed — if an admin changes the title/summary of a published story, the embedding should be refreshed. This already uses `generateEmbeddingForContent` directly and is correct.

### 5. Clean up imports

Replace direct `batchGenerateEmbeddings` / `generateEmbeddingForContent` / `saveEmbeddingTx` imports in `story.ts` with `ensureEmbedding` / `ensureEmbeddings` for the publish paths. Keep the direct imports only for `updateStory` (edit path).

### 6. Update specs

**`.specs/story-pipeline.allium`** — Update the `Publish` rule:

```allium
rule Publish {
    when: PublishJobRuns(story)
    -- Polls for stories where status = selected.
    -- Embedding must already exist from the assess step.

    let new_slug = story.slug ?? slugify(story.title ?? story.source_title)

    requires: story.embedding != null

    ensures: story.slug = new_slug
    ensures: story.date_published = story.date_published ?? now
    ensures: story.status = published
}
```

The `requires: story.embedding != null` stays — it's now a true precondition check, not a generation step. Add a comment clarifying it's a guard, not a producer.

### 7. Update context docs

**`.context/embeddings.md`** — Update "Trigger Points" section:

Remove point 2 ("On publish") entirely. Update the summary to:

> Embeddings are generated **before** the state change is committed during assessment. If embedding generation fails, the assess operation rolls back. No story reaches `analyzed` without a valid embedding, and since publish requires a prior `analyzed` state, published stories are guaranteed to have embeddings.

Keep point 3 ("On edit of published story") as-is.

**`.context/story-pipeline.md`** — Update the publish transition rule to remove mention of embedding generation:

> **selected -> published**: Publish job or manual admin action. Sets `datePublished` if not already set and generates a URL slug if needed. Embeddings must already exist from the assessment step.

## Scope

- `server/src/services/story.ts` (simplify `publishStory`, `updateStoryStatus`, `bulkUpdateStatus`)
- `.specs/story-pipeline.allium` (clarify Publish rule comment)
- `.context/embeddings.md` (remove publish trigger point)
- `.context/story-pipeline.md` (update publish transition description)
