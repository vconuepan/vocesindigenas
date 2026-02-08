# Per-Issue Pre-Assessment Threshold

## Context

The full-assessment job uses a global `fullAssessmentThreshold` (currently `5`) to filter which pre-analyzed stories proceed to full assessment. Some issue categories (e.g. Existential Risks) should have a higher bar to reduce noise. This adds a per-issue override field so each issue can set its own minimum pre-assessment rating.

## Changes

### 1. Database: add `min_pre_rating` column to `issues` table

**Migration:** `server/prisma/migrations/20260208120000_add_issue_min_pre_rating/migration.sql`

```sql
ALTER TABLE "issues" ADD COLUMN "min_pre_rating" INTEGER;
```

Nullable integer — `NULL` means "use the global default".

**Schema:** `server/prisma/schema.prisma` — add to `Issue` model:
```
minPreRating  Int?  @map("min_pre_rating")
```

### 2. Shared types: add field to `Issue` interface

**File:** `shared/types/index.ts`

Add `minPreRating: number | null` to the `Issue` interface.

### 3. Server validation schemas: accept the new field

**File:** `server/src/schemas/issue.ts`

Add `minPreRating: z.number().int().min(1).max(10).nullable().optional()` to both `createIssueSchema` and `updateIssueSchema`.

### 4. Assessment job: query per-issue thresholds

**File:** `server/src/jobs/assessStories.ts`

Replace the current single-query approach with per-issue logic:

1. Fetch all issues with their `minPreRating` values
2. For each issue, determine the effective threshold: `issue.minPreRating ?? config.assess.fullAssessmentThreshold`
3. Query `pre_analyzed` stories for that issue with `relevancePre >= effectiveThreshold`
4. Collect all qualifying story IDs, pass to `assessStories()` as before

Stories with `issueId = null` use the global threshold.

### 5. Admin UI: add input field to IssueEditPanel

**File:** `client/src/components/admin/IssueEditPanel.tsx`

Add a number input for "Min Pre-Rating" in the "LLM Prompt Configuration" section (since it controls assessment behavior). Show placeholder text indicating the global default (5). Use `null` when empty to mean "use global default".

## Files to modify

1. `server/prisma/schema.prisma` — add field to Issue model
2. `server/prisma/migrations/20260208120000_add_issue_min_pre_rating/migration.sql` — new migration
3. `shared/types/index.ts` — add to Issue interface
4. `server/src/schemas/issue.ts` — add to create/update schemas
5. `server/src/jobs/assessStories.ts` — per-issue threshold logic
6. `client/src/components/admin/IssueEditPanel.tsx` — add form field + buildFormState

## Verification

1. Build check: `npm run build --prefix server && npm run build --prefix client`
2. Existing tests: `npm run test --prefix server -- --run`
3. Manual: after migration, edit an issue in admin, set minPreRating to 6, verify it saves and displays correctly
