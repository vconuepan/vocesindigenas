# User Feedback Needed

Items that require user input or pending database migrations from the improvement plans batch.

## Pending Database Migrations

_(Migrations that need to be applied and consolidated with Prisma)_

### Imp-04: Database Indexes
Added `@@index` directives to `schema.prisma` for Story and RefreshToken models. A migration needs to be generated and applied:
- `Story`: `[status, dateCrawled]`, `[feedId]`, `[status, relevancePre]`, `[status, relevance]`, `[datePublished]`
- `RefreshToken`: `[expiresAt]`

### Imp-10: Unbounded Queries
Already addressed by plan 5 (getStoryIdsByStatus + 1000-row limit). Feeds/issues left as-is per plan (small collections). No additional changes needed.

### Imp-11: Refresh Token Reuse Detection
Added `familyId` and `rotatedAt` columns to RefreshToken schema and created migration SQL at `server/prisma/migrations/20260131230000_add_refresh_token_family_tracking/migration.sql`. Steps:
1. Apply the SQL in pgAdmin
2. `npm run db:migrate:resolve --prefix server -- --applied 20260131230000_add_refresh_token_family_tracking`
3. Stop dev server, run `npm run db:generate --prefix server`
4. Build will have type errors until Prisma client is regenerated

## Skipped Plans (Need User Input)

### Imp-36: Feed Interval Check in SQL
Skipped — the current JS-side filter is correct and feed count is small (<100 rows). Moving to raw SQL loses Prisma type safety for minimal gain. If feed count grows significantly, consider adding a `$queryRaw` implementation or a `pg_trgm`-based approach.

### Imp-41: Monitoring/Metrics Endpoint
Skipped — requires installing `prom-client` npm package, creating metrics instrumentation across multiple services (HTTP, LLM, crawler), and adding admin dashboard components. This is a significant feature that should be explicitly approved before adding a dependency.

### Imp-44: JSON Fields to JSONB
Deferred — the manual `JSON.stringify`/`JSON.parse` serialization works correctly. Migration risk (empty strings, data conversion for `evaluationCriteria`, `sourceNames`, `makeADifference` on Issue model) isn't worth it at this stage. Revisit when adding features that would benefit from native JSONB queries.

## Notes from Implemented Plans

_(Any notes or questions from plans that were implemented but have follow-up items)_
