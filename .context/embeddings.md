# Semantic Search & Embeddings

## Overview

Stories get vector embeddings generated from their content (titleLabel + title + summary) using OpenAI's `text-embedding-3-small` model. These embeddings power hybrid semantic+text search on the public API.

## Embedding Generation

### Content Format
```
[Title Label]: [Title]
[Summary]
```
Missing fields are omitted gracefully. If `titleLabel` is null, the title is used alone.

### Content Hash Tracking
A SHA-256 hash of the embedding input string is stored as `embedding_content_hash`. This detects stale embeddings when content changes.

### Trigger Points

Embeddings are generated **before** the state change is committed, using Prisma interactive transactions for atomicity. If embedding generation fails (after 3 retries via `withRetry`), the entire operation rolls back. No story can reach `analyzed`, `selected`, or `published` status without a valid embedding.

1. **On assessment** (`assessStory`): Embedding generated from LLM analysis results, saved atomically with the analysis data
2. **On publish** (`publishStory`, `updateStoryStatus`, `bulkUpdateStatus`): Embedding generated before setting status to `published`
3. **On edit of published story** (`updateStory`): Regenerates if title/titleLabel/summary changed, saved atomically with the edit
4. **Backfill script**: `npm run migration:backfill-embeddings --prefix server` for existing stories

For bulk publish operations, embeddings are generated for all stories first. Only stories with successful embeddings are published; failures are reported in the response (`failed` and `embeddingWarning` fields).

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
| `server/src/services/embedding.ts` | Core embedding service (generate, hash, batch) |
| `server/src/services/embedding.test.ts` | Unit tests |
| `server/src/lib/vectors.ts` | Raw SQL embedding persistence (`saveEmbedding`, `saveEmbeddingTx`) |
| `server/src/services/story.ts` | Lifecycle hooks + hybrid search |
| `server/src/services/analysis.ts` | Assessment with atomic embedding save |
| `server/src/scripts/migrations/backfill-embeddings.ts` | Backfill script |
| `server/src/config.ts` | Embedding configuration |
| `server/prisma/schema.prisma` | Schema with pgvector fields |
| `server/prisma/migrations/20260206120000_add_embedding_fields/migration.sql` | DB migration |
