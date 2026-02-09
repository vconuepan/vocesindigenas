# Plan: Add `publish_stories` Job

## What It Does

New job that publishes all stories with status `selected` — sets their status to `published` and their `datePublished` to now (if not already set). No LLM involved; pure database update.

## Files to Modify

### 1. New file: `server/src/jobs/publishStories.ts`

```typescript
export async function runPublishStories(): Promise<void> {
  // Query all stories with status 'selected'
  // Bulk-update to 'published', set datePublished on those that don't have it
  // Log count
}
```

Uses the existing `bulkUpdateStatus()` from `story.ts` (which already handles the `datePublished` logic for publish).

### 2. `shared/types/index.ts`

Add `'publish_stories'` to the `JobName` union type.

### 3. `shared/constants/index.ts`

Add `'publish_stories'` to the `JOB_NAMES` array (last position).

### 4. `server/src/jobs/scheduler.ts`

- Import `runPublishStories`
- Add `publish_stories: runPublishStories` to `JOB_HANDLERS`

### 5. `server/src/routes/admin/jobs.ts`

- Import `runPublishStories`
- Add `publish_stories: runPublishStories` to the local `JOB_HANDLERS`

### 6. `server/prisma/seed.ts`

Add upsert for `publish_stories` with cron `0 11 * * *` (11 AM daily, one hour after select), disabled.

### 7. `server/src/scripts/seed-jobs.ts`

Same upsert entry.

### 8. `client/src/lib/constants.ts`

- Add `publish_stories: 'Publish Stories'` to `JOB_DISPLAY_NAMES`
- Add `'publish_stories'` at the end of `JOB_PIPELINE_ORDER`

### 9. Documentation

- Update `.context/story-pipeline.md`: add `publish_stories` to the automated jobs table and update the transition rule for `selected → published`.
- Update `CLAUDE.md` context entry if the summary sentence changes.

## Verification

1. `npm run build --prefix server` — no type errors
2. `npm run build --prefix client` — no type errors
3. `npm run test --prefix server` — all tests pass
