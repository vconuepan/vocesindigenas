# Plan: MySQL to PostgreSQL Data Migration

## Requirements

Migrate data from two MySQL `.sql` dump files into the new PostgreSQL database via Prisma:

- **Small file** (`original-mysql-everything-except-stories.sql`, 1.1 MB): 14 issues, 100+ feeds, newsletters, podcasts
- **Large file** (`original-mysql-stories-200mb.sql`, 193 MB): ~40K stories

The migration script must be idempotent — safe to re-run without duplicating data (upsert on unique keys).

## Key Mapping Decisions

### 1. Issue Mapping (old MySQL IDs → new Prisma issues)

The old DB has 14 issues. Several are sub-categories of existential risks. We'll consolidate:

| Old ID | Old Name | → New Issue Slug | Notes |
|--------|----------|-----------------|-------|
| 1 | General News | `general-news` | New issue |
| 2 | Nuclear war and major power struggles | `existential-threats` | Merged into existential threats |
| 3 | Climate Change | `planet-climate` | Merged with ID 7, 13 |
| 4 | Artificial Intelligence | `ai-technology` | Maps to existing seed |
| 5 | Pandemics | `existential-threats` | Merged into existential threats |
| 6 | Bioterrorism and bioweapons | `existential-threats` | Merged into existential threats |
| 7 | Ecological collapse | `planet-climate` | Merged with climate |
| 8 | Global governance failure | `society-governance` | Maps to existing seed concept |
| 9 | Natural catastrophes | `existential-threats` | Merged into existential threats |
| 11 | Existential threats | `existential-threats` | Direct match |
| 12 | Science & Technology | `science-technology` | New issue |
| 13 | Planet & Climate | `planet-climate` | Direct match |
| 14 | Human development | `human-development` | New issue |

Resulting consolidated issues (7 total):
- `general-news` — General News
- `existential-threats` — Existential Threats (nuclear, pandemics, bioweapons, natural catastrophes)
- `planet-climate` — Planet & Climate (climate change, ecological collapse)
- `ai-technology` — AI & Technology
- `society-governance` — Society & Governance (global governance failure)
- `science-technology` — Science & Technology
- `human-development` — Human Development

Each issue gets the `promptFactors`, `promptAntifactors`, and `promptRatings` from the most relevant old issue (the parent/broadest one).

### 2. Story Status Mapping

Based on the MySQL fields:

| Condition | → Status |
|-----------|----------|
| `post_id > 0` | `published` |
| `relevance_rating_high IS NOT NULL` AND `post_id = 0` | `rejected` (assessed but not published) |
| `relevance_rating_low IS NOT NULL` AND `relevance_rating_high IS NULL` | `pre_analyzed` |
| Both ratings `NULL` | `fetched` |

### 3. AI Response Parsing

The `ai_response` field is structured plain text (not JSON) with consistent patterns:
- `Article summary:` → `aiSummary`
- `Conservative rating:` → confirms `relevanceRatingLow`
- `Speculative rating:` → confirms `relevanceRatingHigh`
- `Reasons` section → `aiRelevanceReasons`
- `Scenarios` section → `aiScenarios`
- `Relevance summary:` → `aiRelevanceCalculation`
- `Relevance title:` → `aiMarketingBlurb`

We'll parse these into the structured fields and also store the raw text as `aiResponse` JSON (`{ raw: "..." }`).

### 4. Emotion Tag Mapping

Old DB stores emotion tags as free-text strings. Our Prisma enum has: `uplifting`, `surprising`, `frustrating`, `scary`, `calm`. We'll map known values and leave unknown/empty as `null`.

### 5. ID Strategy

Prisma uses UUIDs. We need to:
- Generate deterministic UUIDs or maintain an old-ID → new-UUID lookup map
- Store the lookup for stories so newsletters/podcasts can reference the new story UUIDs in their `storyIds[]` arrays
- Feeds reference issues, stories reference feeds — order matters

## Implementation Phases

### Phase 1: SQL Parser Utility

Create `server/src/scripts/migrate/parse-sql.ts`:
- Stream-read MySQL dump files line by line
- Parse `INSERT INTO` statements extracting row values
- Handle MySQL escaping (backslashes, single quotes)
- Yield parsed rows as typed objects
- **Critical**: Must handle the 200MB file without loading it all into memory

### Phase 2: Migration Script — Issues & Feeds

Create `server/src/scripts/migrate/migrate.ts`:
1. Parse issues from the small SQL file
2. Create consolidated issues in Postgres via Prisma `upsert` (on `slug`)
3. Build `oldIssueId → newIssueUUID` map
4. Parse feeds from the small SQL file
5. Create feeds via Prisma `upsert` (on `url`)
6. Build `oldFeedId → newFeedUUID` map

### Phase 3: Migration Script — Stories

Continue in `migrate.ts`:
1. Stream-parse the large stories SQL file
2. For each batch of ~500 stories:
   - Map `feed_id` → new feed UUID (skip if feed not found)
   - Determine status from `post_id` and ratings
   - Parse `ai_response` text into structured fields
   - Map `emotion_tag` to enum value or null
   - Upsert via Prisma (on `url` as unique key)
3. Build `oldStoryId → newStoryUUID` map (kept in memory for newsletter/podcast mapping)

### Phase 4: Migration Script — Newsletters & Podcasts

Continue in `migrate.ts`:
1. Parse newsletters from the small SQL file
2. Map `post_ids` (comma-separated old story IDs) → new story UUIDs
3. Create newsletters via Prisma `upsert` (on `title + createdAt` composite, or just create with duplicate check)
4. Same for podcasts

### Phase 5: Validation & Reporting

At the end of the migration:
- Print counts: issues, feeds, stories, newsletters, podcasts created/updated/skipped
- Print warnings: unmapped feed IDs, unmapped story IDs, unparseable AI responses
- Verify referential integrity (all story.feedId references valid feeds)

## File Structure

```
server/src/scripts/migrate/
├── migrate.ts          # Main migration orchestrator
├── parse-sql.ts        # MySQL SQL dump parser (streaming)
├── parse-ai-response.ts # AI response text → structured fields parser
├── issue-mapping.ts    # Old issue ID → new slug mapping config
└── types.ts            # TypeScript types for parsed MySQL rows
```

## Running

```bash
npx tsx server/src/scripts/migrate/migrate.ts
```

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| 200MB file causes memory issues | Stream parser, process in batches of 500 |
| MySQL string escaping edge cases | Thorough parser with tests for escaped quotes, backslashes, Unicode |
| Stories with unknown feed_id | Skip with warning (some feeds may have been deleted in old DB) |
| Duplicate run creates duplicates | Upsert on unique keys (`url` for feeds/stories, `slug` for issues) |
| ai_response format varies | Graceful fallback: store raw text even if parsing fails |
| Old `post_ids` in newsletters reference stories we can't map | Store what we can, log warnings for unmapped IDs |
| Stories with `issue_id` but no `feed_id` | The `feed_id` is required in Prisma schema; stories without a valid feed_id will be skipped |
