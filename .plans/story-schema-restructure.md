# Plan: Story Schema Restructure for Relaunch

## Overview

Restructure the Story database model for a clean relaunch. Rename columns for clarity (prefix source fields with `source_`), add `datePublished` for platform publication date, simplify ratings to `relevancePre` + `relevance`, and remove keywords, scenarios, and raw AI response storage. Also update LLM prompts to stop generating removed fields.

## Column Changes Summary

| Current Column | New Column | Notes |
|---|---|---|
| `url` | `sourceUrl` | Rename — source article URL |
| `title` | `title` | Keep — this is our generated title |
| _(new)_ | `sourceTitle` | Add — original article headline |
| `content` | `sourceContent` | Rename — source article text |
| `datePublished` | `sourceDatePublished` | Rename — source article pub date |
| `dateCrawled` | `dateCrawled` | Keep unchanged |
| _(new)_ | `datePublished` | Add — date we publish on our platform |
| `status` | `status` | Keep unchanged |
| `relevanceRatingLow` | `relevancePre` | Rename — pre-assessment rating (immutable after set) |
| `relevanceRatingHigh` | _(removed)_ | Drop — no speculative rating |
| `emotionTag` | `emotionTag` | Keep unchanged |
| `aiResponse` | _(removed)_ | Drop — no longer store full JSON |
| `aiSummary` | `aiSummary` | Keep unchanged |
| `aiQuote` | `aiQuote` | Keep unchanged |
| `aiKeywords` | _(removed)_ | Drop — no longer generated |
| `aiMarketingBlurb` | `aiMarketingBlurb` | Keep unchanged |
| `aiRelevanceReasons` | `aiRelevanceReasons` | Keep unchanged |
| `aiAntifactors` | `aiAntifactors` | Keep unchanged |
| `aiRelevanceCalculation` | `aiRelevanceCalculation` | Keep unchanged |
| `aiScenarios` | _(removed)_ | Drop — no longer generated |
| _(new)_ | `relevance` | Add — full assessment rating (single value) |
| `crawlMethod` | `crawlMethod` | Keep unchanged |
| `feedId` | `feedId` | Keep unchanged |
| `createdAt` | `createdAt` | Keep unchanged |
| `updatedAt` | `updatedAt` | Keep unchanged |

## Implementation Phases

### Phase 1: Database Schema

**Files:** `server/prisma/schema.prisma`

1. Update the `Story` model with all column changes from the table above
2. Create a new Prisma migration (drop and recreate Story table since we're starting fresh)
3. Run `npx prisma generate` to regenerate the client

**Unique constraint:** `sourceUrl` replaces `url` as the unique field.

### Phase 2: Shared Types

**Files:** `shared/types/index.ts`

1. Update the `Story` interface to match new schema
2. Update `StoryCreate` type (if exists) — `url` → `sourceUrl`, `content` → `sourceContent`, add `sourceTitle`
3. Remove `relevanceRatingHigh`, `aiKeywords`, `aiResponse`, `aiScenarios`
4. Add `sourceTitle`, `relevancePre`, `relevance`, `datePublished`

### Phase 3: LLM Schemas and Prompts

**Files:**
- `server/src/schemas/llm.ts`
- `server/src/services/prompts.ts`

1. **Pre-assessment schema** (`preAssessResultSchema`): rename `rating` output field if needed to map to `relevancePre`
2. **Full assessment schema** (`assessResultSchema`):
   - Remove `keywords` field
   - Remove `scenarios` field
   - Remove `speculativeRating` field
   - Keep `conservativeRating` — this becomes the single `relevance` value
3. **Full assessment prompt** (`buildAssessPrompt`):
   - Remove instructions asking for keywords
   - Remove instructions asking for scenarios
   - Remove instructions asking for speculative rating
   - Update output format instructions accordingly
4. **Selection prompt/schema**: No changes needed (only uses IDs and status)

### Phase 4: Story Service

**Files:** `server/src/services/story.ts`

1. Update `createStory()` — accept `sourceUrl`, `sourceTitle`, `sourceContent`, `sourceDatePublished` instead of old names
2. Update `getStories()` — fix any sorting/filtering that references old column names (`url` → `sourceUrl`, rating fields)
3. Update `getPublishedStories()` — update field selection (remove `aiKeywords`, `aiScenarios`; add `sourceTitle`, `relevance`, `relevancePre`, `datePublished`)
4. Update `publishStory()` — set `datePublished` to `new Date()` when publishing for the first time (only if `datePublished` is currently null)
5. Remove references to `relevanceRatingHigh`, `aiResponse`, `aiKeywords`, `aiScenarios`

### Phase 5: Analysis Service

**Files:** `server/src/services/analysis.ts`

1. **Pre-assessment** (`preAssessStories`): write rating to `relevancePre` instead of `relevanceRatingLow`
2. **Full assessment** (`assessStory`):
   - Write single rating to `relevance` instead of `relevanceRatingLow`/`relevanceRatingHigh`
   - Stop writing `aiResponse`, `aiKeywords`, `aiScenarios`
   - Do NOT overwrite `relevancePre` (immutable)
3. **Selection threshold**: Update any code that reads `relevanceRatingLow` to read `relevancePre` (for the >= 3 threshold check)

### Phase 6: Crawler / Extractor

**Files:** `server/src/services/crawler.ts`, `server/src/services/extractor.ts`

1. Update crawler to pass `sourceUrl`, `sourceTitle`, `sourceContent` when creating stories
2. Ensure the extractor's returned `title` gets stored as `sourceTitle`
3. The story's `title` field will initially be set to the same value as `sourceTitle` (until AI generates a better one during analysis, if it does — or we can leave title population to the analysis step)

**Question for implementation:** Currently `title` is set from the crawled article title. Since we now have `sourceTitle` for that purpose, should `title` remain populated at crawl time (same value as `sourceTitle`), or be left null until AI analysis generates one?
  - **Decision needed during implementation**: For now, set `title = sourceTitle` at crawl time so stories always have a displayable title. AI analysis can overwrite `title` later if it generates a `relevanceTitle`.

### Phase 7: Validation Schemas

**Files:** `server/src/schemas/story.ts`

1. Update `createStorySchema` — `url` → `sourceUrl`, `content` → `sourceContent`, add `sourceTitle`
2. Update `updateStorySchema` — rename fields, remove dropped fields, add new fields

### Phase 8: Admin Routes

**Files:** `server/src/routes/admin/stories.ts`

1. Update any direct field references in route handlers
2. Update manual crawl endpoint to use new field names
3. Update filter query params if any reference old names (`ratingMin`/`ratingMax` should filter on which field — `relevancePre` or `relevance`?)
   - **Decision**: Filter on `relevance` when available, fall back to `relevancePre` — or expose both as filter options

### Phase 9: Frontend Updates

**Files:**
- `client/src/pages/StoryPage.tsx`
- `client/src/pages/HomePage.tsx`
- `client/src/pages/IssuePage.tsx`
- `client/src/components/StoryCard.tsx`
- `client/src/pages/admin/StoriesPage.tsx`
- `client/src/components/admin/IssueTable.tsx`
- `client/src/lib/api.ts`
- `client/src/lib/admin-api.ts`

1. Update all TypeScript references to renamed/removed fields
2. Remove any UI that displays keywords or scenarios
3. Update rating display to show `relevancePre` and/or `relevance` instead of low/high
4. Display `datePublished` (platform date) where appropriate
5. Update admin story editing forms

### Phase 10: Tests

**Files:** `server/src/routes/admin/issues.test.ts` and any other test files

1. Update test fixtures and assertions to use new field names
2. Remove tests for dropped fields
3. Add tests for new behavior (e.g., `datePublished` set on first publish)

## Risks

- **Medium**: Many files touched across the full stack — careful attention needed to not miss a reference to old column names. TypeScript will catch most issues at build time.
- **Low**: Prisma migration is destructive (drop + recreate) — acceptable since this is a clean-slate relaunch.
- **Low**: LLM prompt changes could affect output quality — the removals (keywords, scenarios, speculative rating) are straightforward deletions that simplify rather than alter the core analysis.

## Verification

- `npm run build --prefix server` — zero type errors
- `npm run test --prefix server -- --run` — all tests pass
- `npm run build --prefix client` — zero type errors
- `npm run test --prefix client -- --run` — all tests pass
