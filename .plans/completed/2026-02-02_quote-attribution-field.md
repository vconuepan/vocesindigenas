# Quote Attribution Feature + Migration Override Mode

## Overview

Add a `quoteAttribution` field alongside the existing `quote` field. Attribution identifies the speaker/organization, or "original article" for striking sentences. Also add `--override` mode to all migration scripts.

## Steps

### 1. Database Migration

Add `quote_attribution` column to stories table.

**File:** `server/prisma/schema.prisma`
- Add `quoteAttribution String? @map("quote_attribution")` after the `quote` field

**File:** `server/prisma/migrations/<timestamp>_add_quote_attribution/migration.sql`
```sql
ALTER TABLE "stories" ADD COLUMN "quote_attribution" TEXT;
```

Then: user runs SQL in pgAdmin, resolve migration, regenerate Prisma client.

### 2. Shared Types

**File:** `shared/types/index.ts`
- Add `quoteAttribution: string | null` after `quote` in the `Story` interface
- Add `quoteAttribution: string | null` to `PublicStory` if it's separate (check)

### 3. LLM Schema + Prompt

**File:** `server/src/schemas/llm.ts`
- Add `quoteAttribution` to `assessResultSchema`:
  ```
  quoteAttribution: z.string().describe(
    "Attribution for the key quote. If quoting a person, use their full name and title/role " +
    "(e.g. 'Maria Helena Semedo, FAO Deputy Director'). If quoting an organization or publication, " +
    "use the organization name (e.g. 'World Health Organization'). If the quote is a striking " +
    "sentence from the article rather than a direct quote, use 'Original article'."
  )
  ```
- Add `extractQuoteAttributionSchema` for backfill script:
  ```typescript
  export const extractQuoteAttributionSchema = z.object({
    quote: z.string().describe("The key quote, cleaned up if needed"),
    quoteAttribution: z.string().describe(/* same as above */),
  })
  ```

**File:** `server/src/prompts/assess.ts`
- Update the "Key quote" section to split into quote + attribution:
  ```
  Key quote
  - The most important exact quote, with attribution.
  - If no quote exists, use a striking sentence from the article.
  - Translate to English if needed.

  Quote attribution
  - If quoting a person: their full name and title/role (e.g. "Maria Helena Semedo, FAO Deputy Director").
  - If quoting an organization or publication: the organization name.
  - If the quote is a striking sentence (not a direct quote from a person): "Original article".
  ```

### 4. Server Services

**File:** `server/src/services/analysis.ts`
- Add `quoteAttribution: parsed.quoteAttribution || null` to the DB update in `assessStory()`

**File:** `server/src/services/story.ts`
- Add `quoteAttribution: true` to `ADMIN_LIST_SELECT` and `PUBLIC_STORY_SELECT`

**File:** `server/src/schemas/story.ts`
- Add `quoteAttribution: z.string().nullable().optional()` to `updateStorySchema`

### 5. Client UI Updates

**File:** `client/src/components/PullQuote.tsx`
- Update the `attribution` footer to use `story.quoteAttribution` when available:
  - If `quoteAttribution` exists and is not "Original article": show `— {quoteAttribution}, via {story link}`
  - If "Original article" or no attribution: keep current behavior (`— from {story link}`)

**File:** `client/src/components/StoryCard.tsx`
- In horizontal, featured, and equal variants where quotes are displayed:
  - Add a small attribution line below the quote text
  - Style: `text-xs text-neutral-500 mt-1` with `— {quoteAttribution}`
  - Only show if `quoteAttribution` exists and is not "Original article" (for card-level display, "Original article" adds no value)

**File:** `client/src/pages/StoryPage.tsx`
- Update the editorial blockquote section (lines 207-224):
  - Add attribution below the quote: `— {quoteAttribution}` in `text-sm text-neutral-500 mt-3`
  - Show for all values including "Original article"

**File:** `client/src/pages/HomePage.tsx`
- Hero section quote (line 71-75): add attribution line if available

### 6. Admin UI

**File:** `client/src/components/admin/StoryEditForm.tsx`
- Add `quoteAttribution` to `buildFormState` and `toPayload`
- Add "Quote Attribution" input field below the existing "Quote" input

### 7. Backfill Migration Script

**File:** `server/src/scripts/migrations/backfill-quote-attribution.ts` (NEW)

Modes: `--test` (3 stories, no writes), batch (default, writes to DB), `--override` (re-processes all published stories including those with existing `quoteAttribution`)

Query logic:
- Default batch: published stories where `quote IS NOT NULL AND quoteAttribution IS NULL`
- Override: published stories where `quote IS NOT NULL` (ignores existing attribution)
- Test: same as whichever mode + limit 3

LLM prompt: Send the quote text + article title + publisher, ask for attribution extraction.

**File:** `server/package.json`
- Add scripts:
  ```
  "migration:backfill-quote-attribution": "tsx src/scripts/migrations/backfill-quote-attribution.ts"
  "migration:backfill-quote-attribution:test": "tsx src/scripts/migrations/backfill-quote-attribution.ts --test"
  ```

### 8. Add Override Mode to Title Label Script

**File:** `server/src/scripts/migrations/backfill-title-label.ts`
- Add `const OVERRIDE_MODE = process.argv.includes('--override')`
- In override mode: query all published stories (not just those with `:` in title), re-extract titleLabel and title even if already set
- Log mode at startup: `TEST`, `OVERRIDE`, or `BATCH`

### 9. Tests

#### 9a. Server: Update `analysis.test.ts`

**File:** `server/src/services/analysis.test.ts`

The existing `assessStory` test (line 192) has a mock response that doesn't include `titleLabel` (from the previous feature) or `quoteAttribution`. Update the mock to include both fields, and assert that both are written to the DB update:

```typescript
const structuredResponse = {
  // ... existing fields ...
  titleLabel: 'Test topic',
  quoteAttribution: 'Dr. Smith, University of Oxford',
  // ... rest ...
}
```

Assert:
```typescript
expect(mockPrisma.story.update).toHaveBeenCalledWith({
  where: { id: 'story-1' },
  data: expect.objectContaining({
    titleLabel: 'Test topic',
    quoteAttribution: 'Dr. Smith, University of Oxford',
    // ... existing assertions ...
  }),
})
```

#### 9b. Client: `title-label.test.ts` (NEW — covers previous feature)

**File:** `client/src/lib/title-label.test.ts` (NEW)

Unit tests for the existing `getTitleLabel()` and `getHeadline()` functions:

- `getTitleLabel` returns explicit `titleLabel` when set
- `getTitleLabel` extracts label from colon-prefixed legacy title
- `getTitleLabel` returns null when no colon in title
- `getTitleLabel` returns null when colon prefix > 40 chars
- `getHeadline` returns full title when `titleLabel` is set (no stripping)
- `getHeadline` strips colon prefix for legacy stories without `titleLabel`
- `getHeadline` falls back to `sourceTitle` when `title` is null

#### 9c. Server: Schema validation tests (NEW)

**File:** `server/src/schemas/llm.test.ts` (NEW)

Test that `assessResultSchema` validates correctly with the new `quoteAttribution` field:

- Accepts valid complete response including `quoteAttribution`
- Rejects response missing required `quoteAttribution`
- Accepts `extractQuoteAttributionSchema` with valid input
- Accepts `extractTitleLabelSchema` with valid input (cover the existing schema too)

Pattern: Direct Zod `.parse()` / `.safeParse()` calls — no mocking needed.

#### 9d. Build + run all tests

- `npm run build --prefix server`
- `npm run build --prefix client`
- `npm run test --prefix server -- --run`
- `npm run test --prefix client -- --run`

### 10. Visual verification

- Use Playwright to check StoryPage and HomePage for correct quote attribution display

### 11. Documentation

- Update `.context/story-pipeline.md` to mention `quoteAttribution` field
- Update `CLAUDE.md` context file entries if needed

## Files Modified

| File | Change |
|------|--------|
| `server/prisma/schema.prisma` | Add `quoteAttribution` field |
| `server/prisma/migrations/*/migration.sql` | New migration SQL |
| `shared/types/index.ts` | Add `quoteAttribution` to interfaces |
| `server/src/schemas/llm.ts` | Add to `assessResultSchema` + new extraction schema |
| `server/src/schemas/story.ts` | Add to `updateStorySchema` |
| `server/src/prompts/assess.ts` | Split quote instructions into quote + attribution |
| `server/src/services/analysis.ts` | Store `quoteAttribution` from LLM result |
| `server/src/services/analysis.test.ts` | Update mock to include `quoteAttribution` + `titleLabel` |
| `server/src/services/story.ts` | Add to select objects |
| `server/src/schemas/llm.test.ts` | NEW: schema validation tests |
| `client/src/lib/title-label.test.ts` | NEW: unit tests for getTitleLabel/getHeadline |
| `client/src/components/PullQuote.tsx` | Show attribution in footer |
| `client/src/components/StoryCard.tsx` | Show attribution below quotes |
| `client/src/pages/StoryPage.tsx` | Show attribution below editorial blockquote |
| `client/src/pages/HomePage.tsx` | Show attribution in hero quote |
| `client/src/components/admin/StoryEditForm.tsx` | Add attribution input |
| `server/src/scripts/migrations/backfill-quote-attribution.ts` | NEW: backfill script |
| `server/src/scripts/migrations/backfill-title-label.ts` | Add `--override` mode |
| `server/package.json` | Add npm scripts |

## Verification

1. Build both server and client successfully
2. All existing + new tests pass
3. User runs DB migration in pgAdmin
4. Run backfill script in test mode, verify LLM returns sensible attributions
5. Run backfill in batch mode
6. Visually check StoryPage, HomePage, and PullQuote via browser
7. Test override mode on title-label script (test mode)
