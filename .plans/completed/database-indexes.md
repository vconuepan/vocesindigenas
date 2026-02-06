# Plan: Issue 4 — Missing Database Indexes

**Improvement:** #4 from `improvements.md`
**Priority:** HIGH / Performance

## Problem

The `Story` table has no explicit indexes on the most frequently queried columns: `status`, `dateCrawled`, `feedId`, `relevancePre`, `relevance`, `datePublished`. Nearly every query filters by `status` and sorts by `dateCrawled`, causing full table scans as the table grows.

## Approach

Add indexes in a single Prisma migration. Focus on the highest-impact composite index first.

## Steps

1. **Add indexes to `prisma/schema.prisma` on the `Story` model:**
   ```prisma
   @@index([status, dateCrawled])   // Most common query pattern
   @@index([feedId])                // FK queries
   @@index([status, relevancePre])  // Pre-assessment threshold queries
   @@index([status, relevance])     // Assessment threshold queries
   @@index([datePublished])         // Public story ordering
   ```

2. **Optionally add index on `RefreshToken`:**
   ```prisma
   @@index([expiresAt])  // For cleanup queries (issue 38)
   ```

3. **Create and apply migration:**
   ```bash
   npm run db:migrate --prefix server -- --name add_story_indexes
   ```

4. **Verify queries use new indexes** by checking query plans (optional).

## Files Changed

- `server/prisma/schema.prisma` — add `@@index` directives

## Decisions

- **Q4.1**: All indexes in a single migration ✓
- **Q4.2**: Yes, add all: composite (status, dateCrawled), feedId, relevancePre, relevance, datePublished ✓
- **Q4.3**: Yes, add RefreshToken.expiresAt index ✓

## Risks

- Migration will take time on large tables (index creation locks). On Render's PostgreSQL, this should be fast for current data volumes.
- No functional risk — indexes only affect query performance.
