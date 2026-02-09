# Plan: Add `titleLabel` field to stories

## Overview

Add a `title_label` column to stories. The existing `title` field stays as-is (the headline). The new `titleLabel` is a short topic label (e.g. "EU AI Act") that appears as a kicker/eyebrow above the headline in the UI. The LLM assessment now returns both fields separately instead of combining them with a colon.

## Design Decisions

- **Single new column**: Only `title_label` is added. `title` keeps its current role — no renaming, no second headline column.
- **UI style**: Label renders as a kicker/eyebrow (block element above the headline), not inline.
- **Scripts folder**: `server/src/scripts/migrations/` for one-off backfill scripts.
- **Scope**: Assessment stage only. Pre-assessment unchanged.
- **Backward compat**: `title` continues to hold the full headline. RSS, newsletter, carousel, podcast, selection prompt all keep using `title` — no changes needed there.

## Phase 1: Database Migration

1. **Update Prisma schema** (`server/prisma/schema.prisma`) — Add to the `Story` model:
   ```prisma
   titleLabel      String?      @map("title_label")
   ```

2. **Generate & apply migration** — Follow database-migrations.md workflow (generate SQL, user runs in pgAdmin, resolve, regenerate Prisma client).

## Phase 2: Shared Types & LLM Schema

3. **Update shared types** (`shared/types/index.ts`) — Add `titleLabel: string | null` to `Story` interface.

4. **Update LLM Zod schema** (`server/src/schemas/llm.ts`) — In `assessResultSchema`, add a new `titleLabel` field alongside existing `relevanceTitle`:
   - `titleLabel` — "Short topic label (2-5 words), e.g. 'EU AI Act', 'Ocean biodiversity'"
   - Keep `relevanceTitle` but rename to just produce the headline part (without the "label: " prefix).

5. **Update assessment prompt** (`server/src/prompts/assess.ts`) — Split the "Title" instructions into two: a "Title label" section (short topic tag, 2-5 words, with examples) and a "Title" section (the headline itself, no longer prefixed with the label).

6. **Update assessment service** (`server/src/services/analysis.ts`) — In `assessStory()`, write `titleLabel` to DB from parsed result. Write `title` from the headline portion only (no more colon-prefix).

## Phase 3: Server Query Updates

7. **Update story service selects** (`server/src/services/story.ts`) — Add `titleLabel: true` to `ADMIN_LIST_SELECT` and `PUBLIC_STORY_SELECT`.

## Phase 4: Client Display Utility

8. **Create `getTitleLabel` utility** (`client/src/lib/title-label.ts`) — For stories that have `titleLabel`, returns it directly. For older stories without it, attempts to extract a label by splitting `title` on the first colon (if the prefix is short enough, < ~40 chars). Returns `null` if no label can be determined. Also exports a `getTitleWithoutLabel` helper that returns the headline portion after stripping the label prefix.

## Phase 5: Public UI Changes

9. **Update StoryCard** (`client/src/components/StoryCard.tsx`) — All 4 variants: add a kicker line above the headline `<h3>`:
   ```tsx
   {label && <span className="block text-sm font-medium text-neutral-500 mb-1">{label}</span>}
   ```
   The headline text (`title`) should no longer include the label prefix (use `getTitleWithoutLabel`).

10. **Update StoryPage** (`client/src/pages/StoryPage.tsx`) — Show label as kicker above the `<h1>`:
    ```tsx
    {label && <span className="block text-lg font-semibold text-neutral-500 mb-2">{label}</span>}
    ```
    Meta tags keep using the full `title` for SEO.

11. **Update HomePage hero** (`client/src/pages/HomePage.tsx`) — Same kicker pattern above hero headline.

## Phase 6: Admin UI Changes

12. **Update StoryEditForm** (`client/src/components/admin/StoryEditForm.tsx`) — Add a "Title Label" input above the existing "Title" input. Wire up `titleLabel` in `buildFormState` and `toPayload`.

13. **Update admin display components** (StoryTable, StoryDetailPage, AssignedStoriesList) — No changes strictly needed since they already use `title`. Optionally show `titleLabel` as a small prefix in the table.

## Phase 7: Backfill Script

14. **Add `extractTitleLabelSchema`** to `server/src/schemas/llm.ts`:
    ```typescript
    export const extractTitleLabelSchema = z.object({
      titleLabel: z.string().describe("Short topic label (2-5 words)"),
    })
    ```

15. **Create backfill script** (`server/src/scripts/migrations/backfill-title-label.ts`):
    - Queries stories where `title IS NOT NULL AND title_label IS NULL`
    - Sends each title to smallest model with a simple prompt: "Extract a short topic label (2-5 words) from this headline"
    - Uses `Semaphore` with concurrency 10
    - Cursor-based pagination (resumable — re-running picks up where it left off)
    - **Batch mode**: updates DB with results
    - **Test mode** (via CLI flag `--test`): processes first 3 stories, prints results, no DB writes

16. **Add npm scripts** to `server/package.json`:
    ```json
    "migration:backfill-title-label": "tsx src/scripts/migrations/backfill-title-label.ts",
    "migration:backfill-title-label:test": "tsx src/scripts/migrations/backfill-title-label.ts --test"
    ```

## Phase 8: Build & Test

17. **Build server** — `npm run build --prefix server`
18. **Build client** — `npm run build --prefix client`
19. **Run server tests** — `npm run test --prefix server -- --run`
20. **Run client tests** — `npm run test --prefix client -- --run`
21. **Update existing tests** for the new `titleLabel` field where needed.

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| LLM extracts poor labels during backfill | Test mode for manual review first; client fallback splits on colon |
| Backfill rate limits | Cheapest model, concurrency 10, cursor-based resume |
| Visual regressions | Manual check of all 4 StoryCard variants + StoryPage + hero |
| Older stories without `titleLabel` | Client utility falls back to colon-split extraction from `title` |

## Key Files

- `server/prisma/schema.prisma` — DB schema
- `server/src/schemas/llm.ts` — LLM response schemas
- `server/src/prompts/assess.ts` — Assessment prompt
- `server/src/services/analysis.ts` — Assessment service
- `server/src/services/story.ts` — Story queries
- `shared/types/index.ts` — Shared types
- `client/src/lib/title-label.ts` — Display utility (new)
- `client/src/components/StoryCard.tsx` — Story cards (4 variants)
- `client/src/pages/StoryPage.tsx` — Story detail page
- `client/src/pages/HomePage.tsx` — Homepage hero
- `server/src/scripts/migrations/backfill-title-label.ts` — Backfill script (new)

## Success Criteria

- [x] New stories get `titleLabel` from LLM assessment
- [x] New story `title` no longer includes label prefix (just the headline)
- [ ] Existing stories backfilled with `titleLabel` via script (script ready, needs to be run)
- [x] Public UI shows label as kicker/eyebrow above headline
- [x] Admin edit form has separate title label input
- [x] All builds pass, all tests pass
