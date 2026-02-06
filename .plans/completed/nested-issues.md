# Plan: Nested Issues (One Level) — COMPLETED

## Requirements

Allow Issues to be nested one level deep. Example: "AI Alignment" can be a child of "Existential Risks." Each child issue has its own prompt instructions, feed associations, and static content. Key behaviors:

- **Prompt guidelines**: Fully independent (no inheritance from parent)
- **Feeds**: Can be assigned to either parent or child issues
- **Public site**: Child issues get their own page (`/issues/ai-alignment`). Parent issue pages aggregate stories from all children + direct feeds
- **Home page**: Parent sections only — stories from children are mixed into the parent section
- **Static content**: Moved from hardcoded `issues-content.ts` into the database, editable via admin UI
- **Admin UI**: Single issues table with child issues indented under their parent. Optional "Parent Issue" dropdown when creating/editing

## Phase 1: Database Schema Changes

### 1a. Add `parentId` to Issue model

Add a self-referential nullable `parentId` field:

```prisma
model Issue {
  // ... existing fields ...
  parentId  String?  @map("parent_id")
  parent    Issue?   @relation("IssueHierarchy", fields: [parentId], references: [id])
  children  Issue[]  @relation("IssueHierarchy")
}
```

Constraint: only one level of nesting. If an issue already has a parent, it cannot be a parent itself. Enforced in service layer validation.

### 1b. Add static content fields to Issue model

Move the hardcoded content from `issues-content.ts` into the database:

```prisma
model Issue {
  // ... existing fields ...
  intro               String  @default("")
  evaluationIntro     String  @default("") @map("evaluation_intro")
  evaluationCriteria  String  @default("") @map("evaluation_criteria")   // JSON array stored as string
  sourceNames         String  @default("") @map("source_names")          // JSON array stored as string
  makeADifference     String  @default("") @map("make_a_difference")     // JSON array of {label, url} stored as string
}
```

Using string fields with JSON serialization keeps it simple and avoids new tables. These are display-only fields, not queried.

### 1c. Prisma migration

Create migration, seed existing issues' static content from the current `issues-content.ts` data.

**Files changed:**
- `server/prisma/schema.prisma`
- New migration file in `server/prisma/migrations/`
- `server/src/scripts/migrate/` — seed script to populate static content for existing issues

## Phase 2: Shared Types

Update the `Issue` interface in `shared/types/index.ts`:

```typescript
export interface Issue {
  // ... existing fields ...
  parentId: string | null
  parent?: Issue | null
  children?: Issue[]
  intro: string
  evaluationIntro: string
  evaluationCriteria: string[]    // Parsed from JSON
  sourceNames: string[]           // Parsed from JSON
  makeADifference: { label: string; url: string }[]  // Parsed from JSON
}
```

**Files changed:**
- `shared/types/index.ts`

## Phase 3: Backend Service & Routes

### 3a. Issue service updates

- `getAllIssues()` — Include `children` and `parent` relations. Return flat list with hierarchy info for admin
- `getPublicIssues()` — Return top-level issues only (where `parentId` is null), with children included
- `getPublicIssueBySlug(slug)` — Works for both parent and child issues
- `createIssue()` / `updateIssue()` — Accept `parentId`. Validate:
  - If `parentId` is set, the parent must exist and must NOT itself have a parent (one-level limit)
  - If issue has children, it cannot be assigned a parent
- `deleteIssue()` — Cannot delete if it has children (in addition to existing feeds check)
- Add JSON parse/serialize helpers for the new array fields (`evaluationCriteria`, `sourceNames`, `makeADifference`)

### 3b. Story service updates

- `getPublishedStories()` with `issueSlug` filter — When the slug is a parent issue, also include stories from child issues' feeds. Query: `where.feed.issue` becomes `where.feed.issue: { OR: [{ slug }, { parent: { slug } }] }`
- Same logic for `getStories()` admin endpoint when filtering by issue

### 3c. Issue schema updates (Zod)

- Add `parentId` (optional nullable string) to create/update schemas
- Add new static content fields to create/update schemas
- Add validation: `evaluationCriteria` as string array, `makeADifference` as array of `{ label, url }`

### 3d. Route updates

- Admin issue routes already handle CRUD — just pass through new fields
- Public issue route: No changes needed if service layer handles it
- Public stories route: No changes needed if service layer handles aggregation

**Files changed:**
- `server/src/services/issue.ts`
- `server/src/services/story.ts`
- `server/src/schemas/issue.ts`
- `server/src/routes/admin/issues.ts` (minor, validation)
- `server/src/routes/public/stories.ts` (if query logic lives here)

## Phase 4: Analysis Pipeline

The analysis pipeline groups stories by issue and applies issue-specific prompt guidelines. Since child issues are fully independent in prompt configuration, no changes are needed — stories from a child issue's feed will use that child issue's `promptFactors`/`promptAntifactors`/`promptRatings` as they already do (via `story.feed.issue`).

**No changes required** in `analysis.ts` or `prompts.ts`.

## Phase 5: Admin Frontend

### 5a. Issues table — indented children

Update `IssueTable.tsx` to:
- Sort issues: parents first (alphabetical), then children under their parent
- Indent child issue rows (e.g., left padding + a subtle visual indicator)
- Show parent name in a column or as a badge on child rows

### 5b. Issue edit form — parent selector + static content

Update `IssueEditPage.tsx` to:
- Add "Parent Issue" optional dropdown (only shows issues that have no parent and are not the current issue)
- Add static content fields:
  - `intro` — textarea
  - `evaluationIntro` — textarea
  - `evaluationCriteria` — list editor (add/remove/reorder strings)
  - `sourceNames` — list editor
  - `makeADifference` — list editor with label + URL fields
- Disable parent selection if issue has children (with explanation)

### 5c. Feed form — updated issue selector

The feed form's issue dropdown should show the hierarchy:
- "Existential Risks"
- "  └ AI Alignment"
- "  └ Nuclear"
- "Planet & Climate"
- etc.

### 5d. Hooks

- Update `useIssues` hook to include new fields
- No new hooks needed

**Files changed:**
- `client/src/components/admin/IssueTable.tsx`
- `client/src/pages/admin/IssueEditPage.tsx`
- `client/src/pages/admin/FeedsPage.tsx` (issue selector)
- `client/src/hooks/useIssues.ts`
- `client/src/lib/admin-api.ts` (if types need updating)

## Phase 6: Public Frontend

### 6a. Issue page — aggregated stories

Update `IssuePage.tsx`:
- When viewing a parent issue, stories from all child issues are included (handled by API)
- Show child issues as navigation links or tabs on the parent page
- Replace hardcoded `getIssueContent()` with data from the API response

### 6b. Child issue pages

Child issues get their own page at `/issues/:slug`. The existing `IssuePage.tsx` component already handles this via slug lookup — it just needs to use API data for static content instead of `issues-content.ts`.

### 6c. Issues listing page

Update `IssuesPage.tsx`:
- Show parent issues as main cards
- Show child issues as sub-items within parent cards, or as smaller linked cards
- Replace hardcoded content with API data

### 6d. Home page

Update `HomePage.tsx`:
- When fetching stories for a parent issue section, the API now returns child issue stories too (handled by backend)
- No structural changes needed — parent sections only

### 6e. Remove issues-content.ts

Delete `client/src/data/issues-content.ts` and all imports/references. All content now comes from the API.

**Files changed:**
- `client/src/pages/IssuePage.tsx`
- `client/src/pages/IssuesPage.tsx`
- `client/src/pages/HomePage.tsx` (minimal)
- `client/src/hooks/usePublicIssues.ts` (ensure new fields are exposed)
- `client/src/lib/api.ts` (types)
- Delete `client/src/data/issues-content.ts`

## Phase 7: Data Migration

Create a one-time script (`server/src/scripts/migrate/populate-issue-content.ts`) that:
1. Reads the current `issues-content.ts` data
2. Updates each existing issue in the database with the corresponding static content fields
3. Can be run via `npx tsx server/src/scripts/migrate/populate-issue-content.ts`

## Phase 8: Tests

### Backend tests
- Issue CRUD with `parentId` — create child, validate one-level constraint, delete constraints
- Story filtering — parent slug returns stories from child issues too
- Validation — cannot nest more than one level, cannot delete parent with children

### Frontend tests
- Issue table renders hierarchy correctly
- Issue edit form shows/hides parent selector appropriately

**Files changed:**
- `server/src/routes/admin/issues.test.ts`
- `server/src/routes/public/stories.test.ts`
- `client/src/components/admin/IssueTable.test.tsx` (if exists)

## Phase 9: Documentation

- Update `.context/story-pipeline.md` — mention issue hierarchy
- Update `.context/admin-dashboard.md` — document nested issues in admin
- Update `CLAUDE.md` context file entries if needed

## Risks

- **Story aggregation performance**: Parent issue pages now query across multiple issues. Prisma's `OR` clause on `feed.issue` should be fine given the small number of issues, but worth monitoring.
- **Static content migration**: One-time migration must be run on deploy. Include in deployment notes.
- **Slug uniqueness**: Child issues still need globally unique slugs (enforced by existing DB constraint). This is correct — `/issues/:slug` works for both parents and children.

## Non-goals

- Multiple levels of nesting (only one level)
- Drag-and-drop reordering of issues
- Moving a child issue between parents via the table UI (use edit form)
- Issue-level permissions or visibility controls
