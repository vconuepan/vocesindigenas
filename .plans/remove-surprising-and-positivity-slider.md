# Plan: Remove 'surprising' Emotion Tag + Positivity Slider

**Status: COMPLETED**

## Overview

Two interconnected features:
1. **Remove `surprising`** from the emotion tag system, leaving 4 tags: `uplifting`, `calm` (positive) and `frustrating`, `scary` (negative)
2. **Add a positivity slider** to the public UI that controls the emotion balance of displayed stories

---

## Part 1: Remove 'surprising' Emotion Tag

### Step 1.1: Update all type definitions and constants

Remove `'surprising'` from these files:

| File | What to change |
|------|---------------|
| `shared/types/index.ts:12-16` | Remove `\| 'surprising'` from `EmotionTag` type |
| `shared/constants/index.ts:15` | Remove `'surprising'` from `EMOTION_TAGS` array |
| `server/src/schemas/story.ts:8` | Remove `'surprising'` from `emotionTagEnum` |
| `server/src/schemas/llm.ts:3-12` | Remove `'surprising'` from `EMOTION_TAG_SCHEMA` enum + its description |
| `client/src/lib/constants.ts:17` | Remove `surprising: 'purple'` from `EMOTION_VARIANTS` |

### Step 1.2: Update Prisma schema

**File:** `server/prisma/schema.prisma` (line 26)

Remove `surprising` from the `EmotionTag` enum, leaving: `uplifting`, `frustrating`, `scary`, `calm`.

### Step 1.3: Database migration (SQL-first workflow)

Generate migration folder, then replace SQL with:

```sql
-- Null out existing surprising values
UPDATE "Story" SET "emotion_tag" = NULL WHERE "emotion_tag" = 'surprising';

-- Replace the enum type (PostgreSQL doesn't support ALTER TYPE REMOVE VALUE)
ALTER TYPE "EmotionTag" RENAME TO "EmotionTag_old";
CREATE TYPE "EmotionTag" AS ENUM ('uplifting', 'frustrating', 'scary', 'calm');
ALTER TABLE "Story" ALTER COLUMN "emotion_tag" TYPE "EmotionTag" USING "emotion_tag"::text::"EmotionTag";
DROP TYPE "EmotionTag_old";
```

**Process:** Create migration folder -> user executes SQL in pgAdmin -> resolve as applied -> stop dev server -> run `db:generate`.

### Step 1.4: Update existing migration script

**File:** `server/src/scripts/migrate/migrate.ts:34`

Change `surprising: EmotionTag.surprising` to `surprising: null` in `EMOTION_TAG_MAP` so re-running the old MySQL migration won't fail.

### Step 1.5: Update test fixtures

Change `'surprising'` to `'calm'` in:
- `server/src/jobs/preassessStories.test.ts`
- `server/src/services/analysis.test.ts`
- `server/src/routes/admin/stories.test.ts`

### Step 1.6: Create emotion-only backfill service

Create a lightweight LLM service that ONLY assigns emotion tags (no issue re-classification).

**New files:**
- `server/src/prompts/emotion-tag.ts` — Minimal prompt asking LLM to classify emotion only

**Modified files:**
- `server/src/schemas/llm.ts` — Add `emotionTagOnlyItemSchema` with only `articleId` + `emotionTag`, and `emotionTagOnlyResultSchema`
- `server/src/services/analysis.ts` — Add `tagEmotionOnly(storyIds, onProgress)` using `runBatchClassification()` with small LLM, emotion-only schema, `buildUpdate` that only sets `emotionTag` (no `issueId`), `fallbackToFeedIssue: false`
- `server/src/routes/admin/stories.ts` — Add `POST /stories/bulk-tag-emotions` endpoint
- `shared/types/index.ts` — Add `'emotion'` to `BulkTaskType`
- `server/src/lib/taskRegistry.ts` — Add `'emotion'` to task type if it uses a type union

### Step 1.7: Backfill process (manual, post-migration)

After migration, use admin API to find published stories with `emotionTag = NULL` and trigger the new bulk emotion tagging endpoint. Monitor via task queue polling in admin UI.

### Step 1.8: Update documentation

**File:** `.context/story-pipeline.md:92` — Remove `surprising` from emotion tag list.

### Step 1.9: Verify

- `npm run build --prefix server && npm run test --prefix server -- --run`
- `npm run build --prefix client && npm run test --prefix client -- --run`

---

## Part 2: Positivity Slider

### Design decisions (per user input)

- **Slider has 5 discrete positions** (not continuous): 0%, 25%, 50%, 75%, 100%
  - These represent: 100% negative, 75% negative, balanced, 75% positive, 100% positive
  - Default: 50% (center, balanced)
  - Internally stored as the 5 values; displayed as a slider with snap points
- **Placement (desktop):** In the logo/header bar, left-aligned
- **Placement (mobile):** First item in mobile menu dropdown, before issue categories
- **Scope:** Homepage + issue pages only. Search NOT affected.
- **Persistence:** `localStorage` (personal preference, survives navigation)
- **State management:** React Context (`PositivityProvider`) wrapping `PublicLayout`
- **Caching:** Only 5 discrete values = 5 possible cache entries per endpoint
- **Mobile bonus:** Add "Support Us" link to mobile menu below Subscribe

### Query strategy per slider position

| Position | Positive ratio | Query approach |
|----------|---------------|---------------|
| 0% (leftmost, negative) | 0% positive | **Hard filter:** `emotionTag IN ('frustrating', 'scary')` |
| 25% | 25% positive | **Weighted:** fetch 25% positive + 75% negative per section/page |
| 50% (center) | 50/50 | **Weighted:** fetch 50% positive + 50% negative per section/page |
| 75% | 75% positive | **Weighted:** fetch 75% positive + 25% negative per section/page |
| 100% (rightmost, positive) | 100% positive | **Hard filter:** `emotionTag IN ('uplifting', 'calm')` |

At 25/50/75% stories with `emotionTag = NULL` fill shortfalls in either bucket.

### Step 2.1: Create PositivityContext

**New file:** `client/src/contexts/PositivityContext.tsx`

- `PositivityProvider` with `useState` + `localStorage`
- `usePositivity()` hook returning `{ positivity, setPositivity }`
- Default: 50, storage key: `'ar-positivity'`
- Constrain values to `[0, 25, 50, 75, 100]`

### Step 2.2: Create PositivitySlider component

**New file:** `client/src/components/PositivitySlider.tsx`

- `<input type="range" min={0} max={100} step={25}>` — 5 snap positions
- Left side: positive emojis (uplifting + calm vibes)
- Right side: negative emojis (frustrating + scary vibes)
- ARIA: `aria-label="Story mood balance"`, `aria-valuemin/max/now`
- Compact design (~200px desktop)
- `focus-visible:ring-2 focus-visible:ring-brand-500`
- No debounce needed with discrete positions (instant snap)

### Step 2.3: Integrate into PublicLayout

**File:** `client/src/layouts/PublicLayout.tsx`

1. Wrap with `PositivityProvider` (alongside `SubscribeProvider`)
2. **Desktop:** Place `PositivitySlider` in the logo bar, left side (mirror position of the subscribe button on the right)
3. **Mobile menu:** Add `PositivitySlider` as first item before issue category links
4. **Mobile menu:** Add "Support Us" link below Subscribe (copy Ko-fi link pattern from footer)

### Step 2.4: Add positivity to server schemas

**File:** `server/src/schemas/story.ts`

Add to `publicStoryQuerySchema`:
```ts
positivity: z.coerce.number().int().min(0).max(100).optional().default(50),
```

### Step 2.5: Implement weighted query logic

**File:** `server/src/services/story.ts`

#### Homepage: `getHomepageData(issueSlugs, storiesPerIssue, positivity)`

Weighted bucket approach per issue section:
- `positiveCount = round(N * positivity / 100)`, `negativeCount = N - positiveCount`
- 3 parallel queries per issue: positive stories, negative stories, neutral fallback
- Fill shortfalls from neutral, then from overflow
- Sort combined by `datePublished desc`
- **Hero story: always most recent, unfiltered**
- At 0%/100%: simplify to single filtered query (hard filter)

#### Issue pages: `getPublishedStories(options)` with positivity

Same weighted bucket approach, adapted for pagination:
- `positivePerPage = round(pageSize * positivity / 100)`, `negativePerPage = pageSize - positivePerPage`
- For page N:
  - Fetch `positivePerPage` positive stories, skip `(N-1) * positivePerPage`
  - Fetch `negativePerPage` negative stories, skip `(N-1) * negativePerPage`
  - Neutral stories fill shortfalls
  - Combine and sort by `datePublished desc`
- Total count: `totalPositive + totalNegative + totalNeutral` (all published stories in the issue)
- At 0%/100%: single filtered query (hard filter), clean pagination

### Step 2.6: Update homepage route

**File:** `server/src/routes/public/homepage.ts`

- Parse `positivity` query param (default 50, clamp to valid values)
- Cache key includes positivity: `homepage-data-p${positivity}`
- Pass to `storyService.getHomepageData()`

### Step 2.7: Update stories route

**File:** `server/src/routes/public/stories.ts`

- Pass `positivity` from `req.parsedQuery` to `storyService.getPublishedStories()`

### Step 2.8: Update client API layer

**File:** `client/src/lib/api.ts`

- `publicApi.homepage(positivity?: number)` — pass as query param
- `publicApi.stories.list()` — add `positivity?: number` to params

### Step 2.9: Update client hooks

**`client/src/hooks/useHomepageData.ts`** — Accept `positivity`, include in `queryKey`

**`client/src/hooks/usePublicStories.ts`** — Accept `positivity`, include in `queryKey` and API call

### Step 2.10: Wire up pages

**`client/src/pages/HomePage.tsx`:** Import `usePositivity()`, pass to `useHomepageData(positivity)`

**`client/src/pages/IssuePage.tsx`:** Import `usePositivity()`, pass to `usePublicStories({ ..., positivity })`

**`client/src/pages/SearchPage.tsx`:** NO changes (search not affected)

### Step 2.11: Verify

- Build and test both server and client
- Manual: move slider to each position, verify story mixes change on homepage and issue pages
- Verify localStorage persistence across refresh
- Verify search results unaffected
- Check hero story stays most recent regardless of slider

---

## Files summary

### Part 1 — Modified:
`shared/types/index.ts`, `shared/constants/index.ts`, `server/prisma/schema.prisma`, `server/src/schemas/story.ts`, `server/src/schemas/llm.ts`, `server/src/services/analysis.ts`, `server/src/routes/admin/stories.ts`, `server/src/scripts/migrate/migrate.ts`, `client/src/lib/constants.ts`, `.context/story-pipeline.md`, 3 test files

### Part 1 — New:
`server/src/prompts/emotion-tag.ts`, migration SQL file

### Part 2 — Modified:
`server/src/services/story.ts`, `server/src/routes/public/homepage.ts`, `server/src/routes/public/stories.ts`, `server/src/schemas/story.ts`, `client/src/lib/api.ts`, `client/src/hooks/useHomepageData.ts`, `client/src/hooks/usePublicStories.ts`, `client/src/layouts/PublicLayout.tsx`, `client/src/pages/HomePage.tsx`, `client/src/pages/IssuePage.tsx`

### Part 2 — New:
`client/src/contexts/PositivityContext.tsx`, `client/src/components/PositivitySlider.tsx`
