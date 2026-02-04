# Semantic Search Implementation Plan

## Requirements Restatement

Add semantic search capabilities using pgvector embeddings:

1. **Embedding generation** — Create vector embeddings from story content (title + summary + relevanceSummary) for published stories only
2. **Content hash tracking** — Store a hash of the source content used for embedding, enabling detection of stale embeddings when content changes
3. **Lifecycle handling** — Generate embeddings on publish; regenerate if content changed since last embedding when republishing
4. **Migration script** — Backfill existing published stories with embeddings (test/batch/override modes)
5. **Semantic search endpoint** — Convert public search to use embedding similarity with pgvector
6. **Database optimization** — Add IVFFlat index for fast cosine similarity queries at scale

**Out of scope** (moved to backlog): Similar stories widget on story pages.

---

## Technical Decisions

### Embedding Model
- **Model:** `text-embedding-3-small` (OpenAI)
- **Dimensions:** 1536
- **Input format:**
  ```
  [Issue Title]: [Story Title]
  [Summary]
  [Relevance Summary]
  ```
- **Missing fields:** Use whatever fields are available (don't skip stories missing optional fields)
- **Rationale:** Cost-effective, good quality for semantic search, issue label adds category context

### Content Hash Strategy
- Store SHA-256 hash of the embedding input string (includes issue title, story title, summary, relevanceSummary)
- On publish/edit, compare current content hash with stored hash
- Regenerate embedding only if hash differs (catches issue reassignment too)
- Stored as `embeddingContentHash` (nullable string, 64 chars)

### Embedding Trigger Points
1. **On status → published:** Generate embedding if missing or hash mismatch
2. **On edit of published story:** Regenerate if title/summary/relevanceSummary changed
3. **Manual regeneration:** Admin endpoint to force-regenerate specific stories

---

## Implementation Phases

### Phase 1: Database Schema & Migration

**1.1 Update Prisma Schema**

Add to `Story` model in `server/prisma/schema.prisma`:
```prisma
embedding             Unsupported("vector(1536)")?
embeddingContentHash  String?   @db.VarChar(64)
embeddingGeneratedAt  DateTime?
```

**1.2 Create SQL Migration**

File: `server/prisma/migrations/[timestamp]_add_embedding_fields/migration.sql`
```sql
-- Add embedding column with pgvector type
ALTER TABLE "stories" ADD COLUMN "embedding" vector(1536);

-- Add content hash for change detection
ALTER TABLE "stories" ADD COLUMN "embedding_content_hash" VARCHAR(64);

-- Add timestamp for tracking when embedding was generated
ALTER TABLE "stories" ADD COLUMN "embedding_generated_at" TIMESTAMP(3);

-- Create IVFFlat index for fast similarity search
-- Using 100 lists (good for up to ~100k vectors, adjust later if needed)
CREATE INDEX "stories_embedding_idx" ON "stories"
USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);
```

**1.3 Mark Migration as Applied**
```bash
npm run db:migrate:resolve --prefix server -- --applied [migration_name]
```

---

### Phase 2: Embedding Service

**2.1 Create Embedding Service**

File: `server/src/services/embedding.ts`

```typescript
// Core functions:
// - generateEmbedding(text: string): Promise<number[]>
// - buildEmbeddingContent(story: StoryWithIssue): string
//     → Returns: "[Issue Title]: [Title]\n[Summary]\n[RelevanceSummary]"
//     → Uses whatever fields are available (graceful degradation)
// - computeContentHash(content: string): string
// - needsEmbeddingUpdate(story: Story): boolean
// - updateStoryEmbedding(storyId: string): Promise<void>
// - batchUpdateEmbeddings(storyIds: string[]): Promise<BatchResult>
```

Key implementation details:
- Use OpenAI embeddings API directly (not LangChain, for simplicity)
- Batch API supports up to 2048 inputs per call
- Add retry logic with `withRetry()` from `server/src/lib/retry.ts`
- Rate limit with configurable delay (reuse `rateLimitDelay()` pattern)

**2.2 Add Config Constants**

Add to `server/src/config.ts`:
```typescript
embedding: {
  model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
  dimensions: 1536,
  batchSize: parseInt(process.env.EMBEDDING_BATCH_SIZE || '100'),
  concurrency: parseInt(process.env.EMBEDDING_CONCURRENCY || '5'),
  delayMs: parseInt(process.env.EMBEDDING_DELAY_MS || '100'),
}
```

---

### Phase 3: Lifecycle Integration

**3.1 Hook into Story Service**

Modify `server/src/services/story.ts`:

In `publishStory()` and bulk status update functions:
- After setting status to 'published', call `updateStoryEmbeddingIfNeeded(storyId)`
- This checks hash and generates/updates embedding only if needed

In `updateStory()` (admin edit):
- If story is published AND title/summary/relevanceSummary changed, regenerate embedding

**3.2 Create Helper Function**

```typescript
async function updateStoryEmbeddingIfNeeded(storyId: string): Promise<boolean> {
  const story = await prisma.story.findUnique({ where: { id: storyId } })
  if (!story || story.status !== 'published') return false

  if (needsEmbeddingUpdate(story)) {
    await updateStoryEmbedding(storyId)
    return true
  }
  return false
}
```

---

### Phase 4: Migration Script

**4.1 Create Backfill Script**

File: `server/src/scripts/migrations/backfill-embeddings.ts`

Following established pattern from `backfill-relevance-summary.ts`:

```typescript
// Modes:
// --test     Process first 3 stories, log only (no DB writes)
// --override Regenerate all published story embeddings (ignore existing)
// Default    Process published stories missing embeddings or with stale hash

// Implementation:
// 1. Fetch published stories in batches (cursor pagination)
// 2. Filter: missing embedding OR hash mismatch (unless --override)
// 3. Process with semaphore-controlled concurrency
// 4. Batch OpenAI API calls (up to 100 per request for efficiency)
// 5. Update DB with embedding + hash + timestamp
// 6. Progress logging with counts
```

**4.2 Add npm Script**

In `server/package.json`:
```json
"migration:backfill-embeddings": "tsx src/scripts/migrations/backfill-embeddings.ts",
"migration:backfill-embeddings:test": "tsx src/scripts/migrations/backfill-embeddings.ts --test"
```

---

### Phase 5: Hybrid Search Endpoint (RRF)

**5.1 Hybrid Search Algorithm: Reciprocal Rank Fusion**

RRF combines semantic and text search results by rank position:
```
score = 1/(k + semantic_rank) + 1/(k + text_rank)
```
Where `k = 60` (standard constant). Results appearing in only one search still get scored.

**5.2 Update Story Service**

Add to `server/src/services/story.ts`:

```typescript
async function hybridSearch(options: {
  query: string
  issueSlug?: string
  page?: number
  pageSize?: number
}): Promise<PaginatedStories> {
  // 1. Run semantic search (top 50 by cosine similarity)
  const queryEmbedding = await generateEmbedding(query)
  const semanticResults = await prisma.$queryRaw`
    SELECT id, 1 - (embedding <=> ${queryEmbedding}::vector) as score
    FROM stories
    WHERE status = 'published' AND embedding IS NOT NULL
    ORDER BY embedding <=> ${queryEmbedding}::vector
    LIMIT 50
  `

  // 2. Run text search (top 50 by ILIKE match on title/summary)
  const textResults = await prisma.story.findMany({
    where: {
      status: 'published',
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { summary: { contains: query, mode: 'insensitive' } },
      ],
    },
    select: { id: true },
    take: 50,
  })

  // 3. Compute RRF scores
  const k = 60
  const scores = new Map<string, number>()
  semanticResults.forEach((r, i) => {
    scores.set(r.id, (scores.get(r.id) || 0) + 1 / (k + i + 1))
  })
  textResults.forEach((r, i) => {
    scores.set(r.id, (scores.get(r.id) || 0) + 1 / (k + i + 1))
  })

  // 4. Sort by RRF score, paginate, fetch full stories
  const rankedIds = [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice((page - 1) * pageSize, page * pageSize)
    .map(([id]) => id)

  // 5. Fetch full story data and return
}
```

**5.3 Update Public Stories Route**

Modify `server/src/routes/public/stories.ts`:
- When `search` parameter provided, call `hybridSearch()` instead of text-only search
- Apply issue filter if `issueSlug` also provided

**5.4 Fallback Behavior**
- If embedding generation fails, fall back to text-only search
- Stories without embeddings still appear via text search leg of RRF
- Log warning for monitoring

---

### Phase 6: Testing & Documentation

**6.1 Unit Tests**

File: `server/src/services/embedding.test.ts`
- Test `buildEmbeddingContent()` output format with all fields present
- Test `buildEmbeddingContent()` graceful degradation with missing fields
- Test `computeContentHash()` determinism
- Test `needsEmbeddingUpdate()` logic (hash match, hash mismatch, no hash)
- Mock OpenAI API for embedding generation tests

**6.2 Integration Tests**

File: `server/src/routes/public/stories.test.ts` (extend existing)
- Test hybrid search returns relevant results (RRF ranking)
- Test results from text-only match still appear (stories without embeddings)
- Test fallback to text search when embedding generation fails
- Test pagination with hybrid search

**6.3 Documentation**

Create: `.context/embeddings.md`
- Embedding generation strategy
- Content hash tracking
- When embeddings are generated/updated
- Migration script usage
- Config variables

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| OpenAI API rate limits | Medium | Batch requests (100 per call), configurable delay, retry logic |
| Migration takes too long for large dataset | Low | Cursor pagination, batching, can resume from last position |
| Embedding API costs | Low | text-embedding-3-small is $0.02/1M tokens; ~100 words/story = ~$0.002/1000 stories |
| Query performance at scale | Medium | IVFFlat index with 100 lists; can tune later |
| Prisma `Unsupported` type limitations | Low | Use raw queries for embedding operations |

---

## Dependencies

- OpenAI API key (already configured for LLM calls)
- pgvector extension (already installed)
- No new npm packages needed

---

## File Changes Summary

| File | Change Type |
|------|-------------|
| `server/prisma/schema.prisma` | Modify |
| `server/prisma/migrations/[timestamp]_add_embedding_fields/migration.sql` | Create |
| `server/src/config.ts` | Modify |
| `server/src/services/embedding.ts` | Create |
| `server/src/services/story.ts` | Modify |
| `server/src/routes/public/stories.ts` | Modify |
| `server/src/scripts/migrations/backfill-embeddings.ts` | Create |
| `server/package.json` | Modify |
| `server/src/services/embedding.test.ts` | Create |
| `.context/embeddings.md` | Create |

---

## Execution Order

1. Phase 1: Database schema (requires user to run SQL in pgAdmin)
2. Phase 2: Embedding service (can be tested in isolation)
3. Phase 3: Lifecycle integration (depends on Phase 2)
4. Phase 4: Migration script (depends on Phases 1-2)
5. Phase 5: Semantic search endpoint (depends on Phases 1-2)
6. Phase 6: Testing & documentation (parallel with Phases 3-5)

---

**WAITING FOR CONFIRMATION**: Proceed with this plan? (yes/no/modify)
