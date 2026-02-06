# Semantic Search & Embeddings

## Overview

Stories get vector embeddings generated from their content (title + summary + relevanceSummary prefixed with issue name) using OpenAI's `text-embedding-3-small` model. These embeddings power hybrid semantic+text search on the public API.

## Embedding Generation

### Content Format
```
[Issue Name]: [Title]
[Summary]
[Relevance Summary]
```
Missing fields are omitted gracefully. The issue name comes from `story.issue ?? story.feed.issue`.

### Content Hash Tracking
A SHA-256 hash of the embedding input string is stored as `embedding_content_hash`. This detects stale embeddings when content changes (including issue reassignment).

### Trigger Points
1. **On publish** (`publishStory`, `bulkUpdateStatus`): Fire-and-forget embedding generation
2. **On edit of published story** (`updateStory`): Regenerates if title/summary/relevanceSummary changed
3. **Backfill script**: `npm run migration:backfill-embeddings --prefix server` for existing stories

All embedding operations are non-blocking — failures are logged but don't affect the publish/edit operation.

## Hybrid Search (RRF)

When a search query is provided to `getPublishedStories`, the system runs **Reciprocal Rank Fusion** combining:
- **Semantic search**: Top 50 results by cosine similarity (`embedding <=> query_vector`)
- **Text search**: Top 50 results by ILIKE match on title/summary

RRF formula: `score = 1/(60 + semantic_rank) + 1/(60 + text_rank)`

Results appearing in only one search leg still get scored. If semantic search fails (e.g., API error), the system falls back to text-only search.

## Database

### Schema Fields (on `stories` table)
- `embedding` — `vector(1536)` via pgvector
- `embedding_content_hash` — `VARCHAR(64)`, SHA-256 hex of input content
- `embedding_generated_at` — `TIMESTAMP(3)`

### Index
HNSW index for cosine similarity: `stories_embedding_idx`. HNSW was chosen over IVFFlat because it does not require training data and maintains good recall regardless of when it is created. The query must use the `<=>` (cosine distance) operator to use this index.

**Note**: These fields use raw SQL queries (`$queryRaw`/`$executeRaw`) since Prisma's `Unsupported` type has limited query support.

## Configuration

In `server/src/config.ts` under `embedding`:
- `model` — OpenAI model name (default: `text-embedding-3-small`)
- `dimensions` — Vector dimensions (default: `1536`)
- `batchSize` — Stories per API batch call (default: `100`)
- `concurrency` — Parallel batch limit for backfill (default: `5`)
- `delayMs` — Rate limit delay between API calls (default: `100`)

All configurable via `EMBEDDING_*` environment variables.

## Backfill Script

```bash
npm run migration:backfill-embeddings --prefix server              # process all missing
npm run migration:backfill-embeddings:test --prefix server         # dry run (first 3)
npm run migration:backfill-embeddings --prefix server -- --override  # regenerate all
```

Uses raw SQL for fetching (bypasses Prisma type limitations), processes in batches with semaphore-controlled concurrency.

## Key Files

| File | Purpose |
|------|---------|
| `server/src/services/embedding.ts` | Core embedding service (generate, hash, update) |
| `server/src/services/embedding.test.ts` | Unit tests |
| `server/src/services/story.ts` | Lifecycle hooks + hybrid search |
| `server/src/scripts/migrations/backfill-embeddings.ts` | Backfill script |
| `server/src/config.ts` | Embedding configuration |
| `server/prisma/schema.prisma` | Schema with pgvector fields |
| `server/prisma/migrations/20260206120000_add_embedding_fields/migration.sql` | DB migration |
