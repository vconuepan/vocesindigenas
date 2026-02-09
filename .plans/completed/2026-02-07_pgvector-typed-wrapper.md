# Fix: Typed Wrapper for pgvector Raw SQL

## Problem

All embedding operations use `$queryRaw` / `$executeRaw` with manually defined types because Prisma's `Unsupported("vector(1536)")` type doesn't generate typed fields. This means:
- 9 raw SQL queries across 5 files
- Manual `StoryRow` interface with snake_case fields + `rowToStory()` mapper
- Vector casting pattern (`JSON.stringify(embedding)::vector`) repeated in 3 places
- No type safety on raw SQL results
- Easy to make mistakes (wrong column names, missing fields, cast errors)

## Current State

**Files with raw SQL for pgvector:**

| File | Queries | Purpose |
|------|---------|---------|
| `server/src/services/embedding.ts` | 4 | Fetch stories for embedding, save embeddings |
| `server/src/services/story.ts` | 1 | Semantic search (cosine distance) |
| `server/src/services/feed.ts` | 1 | Dynamic interval filter (not pgvector, but raw SQL) |
| `server/src/routes/health.ts` | 1 | `SELECT 1` connectivity check |
| `server/src/scripts/migrations/backfill-embeddings.ts` | 2 | Backfill script |

**Patterns to consolidate:**

1. **Fetch story for embedding** — repeated in `embedding.ts` (2 variants: single + batch)
2. **Save embedding** — repeated in `embedding.ts` (2 places) + `backfill-embeddings.ts` (1 place)
3. **Cosine distance search** — in `story.ts` (1 place)
4. **Vector string building** — `JSON.stringify(embedding)::vector` in 3 places
5. **Conditional SQL fragments** — `Prisma.empty` / `Prisma.sql` pattern in 3 places

## Implementation

### 1. Create `server/src/lib/vectors.ts`

A thin typed wrapper that centralizes all pgvector operations:

```typescript
import { Prisma } from '@prisma/client'
import prisma from './prisma.js'

// ──── Types ────

export interface StoryEmbeddingRow {
  id: string
  title: string | null
  titleLabel: string | null
  summary: string | null
  embeddingContentHash: string | null
}

// Raw SQL returns snake_case — map to camelCase
interface RawStoryRow {
  id: string
  title: string | null
  title_label: string | null
  summary: string | null
  embedding_content_hash: string | null
}

function mapRow(row: RawStoryRow): StoryEmbeddingRow {
  return {
    id: row.id,
    title: row.title,
    titleLabel: row.title_label,
    summary: row.summary,
    embeddingContentHash: row.embedding_content_hash,
  }
}

// ──── Vector Helpers ────

/** Convert a number array to a pgvector literal for use in SQL */
export function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(',')}]`
}

/** Build a Prisma.sql fragment for a vector value */
export function vectorParam(embedding: number[]): Prisma.Sql {
  return Prisma.sql`${JSON.stringify(embedding)}::vector`
}

// ──── Queries ────

/** Fetch a single story's embedding-relevant fields */
export async function fetchStoryForEmbedding(
  storyId: string,
): Promise<(StoryEmbeddingRow & { status: string }) | null> {
  const rows = await prisma.$queryRaw<(RawStoryRow & { status: string })[]>`
    SELECT id, status, title, title_label, summary, embedding_content_hash
    FROM stories
    WHERE id = ${storyId}
  `
  if (rows.length === 0) return null
  return { ...mapRow(rows[0]), status: rows[0].status }
}

/** Fetch multiple published stories' embedding-relevant fields */
export async function fetchStoriesForEmbedding(
  storyIds: string[],
): Promise<StoryEmbeddingRow[]> {
  if (storyIds.length === 0) return []
  const rows = await prisma.$queryRaw<RawStoryRow[]>`
    SELECT id, title, title_label, summary, embedding_content_hash
    FROM stories
    WHERE id = ANY(${storyIds}) AND status = 'published'
  `
  return rows.map(mapRow)
}

/** Save an embedding to a story */
export async function saveEmbedding(
  storyId: string,
  embedding: number[],
  contentHash: string,
): Promise<void> {
  await prisma.$executeRaw`
    UPDATE stories
    SET embedding = ${JSON.stringify(embedding)}::vector,
        embedding_content_hash = ${contentHash},
        embedding_generated_at = NOW()
    WHERE id = ${storyId}
  `
}

/** Find similar stories by cosine distance */
export async function findSimilarStories(
  storyId: string,
  options?: {
    limit?: number
    issueFilter?: Prisma.Sql
    statusFilter?: string[]
    excludeIds?: string[]
  },
): Promise<{ id: string }[]> {
  const limit = options?.limit ?? 10
  const issueFilter = options?.issueFilter ?? Prisma.empty
  const statusFilter = options?.statusFilter ?? ['published']
  const excludeFilter = options?.excludeIds?.length
    ? Prisma.sql`AND s.id != ALL(${options.excludeIds})`
    : Prisma.empty

  return prisma.$queryRaw<{ id: string }[]>`
    SELECT s.id
    FROM stories s
    WHERE s.id != ${storyId}
      AND s.status = ANY(${statusFilter})
      AND s.embedding IS NOT NULL
      ${issueFilter}
      ${excludeFilter}
    ORDER BY s.embedding <=> (SELECT embedding FROM stories WHERE id = ${storyId})
    LIMIT ${limit}
  `
}

/** Search stories by embedding cosine distance */
export async function searchByEmbedding(
  queryEmbedding: number[],
  options?: {
    limit?: number
    issueFilter?: Prisma.Sql
  },
): Promise<{ id: string }[]> {
  const limit = options?.limit ?? 50
  const issueFilter = options?.issueFilter ?? Prisma.empty
  const vectorStr = toVectorLiteral(queryEmbedding)

  return prisma.$queryRaw<{ id: string }[]>`
    SELECT s.id
    FROM stories s
    WHERE s.status = 'published'
      AND s.embedding IS NOT NULL
      ${issueFilter}
    ORDER BY s.embedding <=> ${vectorStr}::vector
    LIMIT ${limit}
  `
}

/** Cursor-based fetch for backfill scripts */
export async function fetchEmbeddingBackfillBatch(
  cursor: string | undefined,
  limit: number,
  overrideMode: boolean,
): Promise<StoryEmbeddingRow[]> {
  const hashFilter = overrideMode
    ? Prisma.empty
    : Prisma.sql`AND embedding_content_hash IS NULL`
  const cursorFilter = cursor
    ? Prisma.sql`AND id > ${cursor}`
    : Prisma.empty

  const rows = await prisma.$queryRaw<RawStoryRow[]>`
    SELECT id, title, title_label, summary, embedding_content_hash
    FROM stories
    WHERE status = 'published'
    ${hashFilter}
    ${cursorFilter}
    ORDER BY id ASC
    LIMIT ${limit}
  `
  return rows.map(mapRow)
}
```

### 2. Refactor `embedding.ts`

Remove the local `StoryRow`, `rowToStory`, `fetchStoryForEmbedding`, `fetchStoriesForEmbedding` — replace with imports from `lib/vectors.ts`.

Replace inline `$executeRaw` for saving embeddings with `saveEmbedding()`.

### 3. Refactor `story.ts` (search)

Replace the inline semantic search query in `hybridSearch()` with `searchByEmbedding()`.

### 4. Refactor `backfill-embeddings.ts`

Replace local `fetchBatch()` and inline save with `fetchEmbeddingBackfillBatch()` and `saveEmbedding()`.

### 5. Keep non-pgvector raw SQL as-is

The `feed.ts` interval query and `health.ts` `SELECT 1` are not pgvector-related. Leave them untouched — they're simple and self-contained.

## What This Does NOT Do

- Does not change Prisma schema (still `Unsupported`)
- Does not introduce an ORM abstraction over raw SQL
- Does not change query behavior — purely structural refactor
- Does not affect the `feed.ts` or `health.ts` raw queries

## Files to Create/Modify

| File | Action |
|------|--------|
| `server/src/lib/vectors.ts` | Create — centralized pgvector operations |
| `server/src/services/embedding.ts` | Refactor — use `vectors.ts` functions |
| `server/src/services/story.ts` | Refactor — use `searchByEmbedding()` |
| `server/src/scripts/migrations/backfill-embeddings.ts` | Refactor — use `vectors.ts` functions |

## Estimated Scope

Small — pure refactor, no behavior changes. ~200 lines in new file, net reduction in other files. Total line count roughly flat.
