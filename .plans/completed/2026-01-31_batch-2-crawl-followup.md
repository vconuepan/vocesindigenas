# Batch 2 Follow-up

## User Input Needed

_(None yet)_

## DB Migrations

### Plans 03 + 04 + 07 — Feed Crawl Errors, Smart Crawl Status & Health Metrics

Add five columns to the `feeds` table:

```sql
ALTER TABLE feeds ADD COLUMN last_crawl_error TEXT;
ALTER TABLE feeds ADD COLUMN last_crawl_error_at TIMESTAMPTZ;
ALTER TABLE feeds ADD COLUMN consecutive_failed_crawls INTEGER NOT NULL DEFAULT 0;
ALTER TABLE feeds ADD COLUMN consecutive_empty_crawls INTEGER NOT NULL DEFAULT 0;
ALTER TABLE feeds ADD COLUMN last_successful_crawl_at TIMESTAMPTZ;
```

### Plan 09 — RSS Conditional Requests (ETag/Last-Modified)

Add three columns to the `feeds` table:

```sql
ALTER TABLE feeds ADD COLUMN last_etag TEXT;
ALTER TABLE feeds ADD COLUMN last_modified TEXT;
ALTER TABLE feeds ADD COLUMN last_crawl_result TEXT;
```

### Plan 05 — Feed Interval SQL Optimization

Add a partial index for the due-feeds query:

```sql
CREATE INDEX idx_feeds_active_crawl ON feeds (last_crawled_at)
WHERE active = true;
```

### After all migrations

After running in pgAdmin, mark as applied:
```bash
npm run db:migrate:resolve --prefix server -- --applied "<migration_name>"
```

Then generate the Prisma client (stop dev server first):
```bash
npm run db:generate --prefix server
```

## Files to Delete

_(None yet)_

## Implementation Issues

- **Server `npm run build` will fail** until DB migrations are applied and `npm run db:generate --prefix server` is run. The Prisma schema has 8 new fields that don't exist in the generated client yet. All tests pass because they mock the DB layer.
- **New files created:** `server/src/lib/domainLimiter.ts`, `server/src/lib/crawlLimiter.ts`, `server/src/utils/urlNormalization.ts` (and their test files)
