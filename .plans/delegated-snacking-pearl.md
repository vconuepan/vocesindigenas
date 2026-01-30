# Plan: LLM Interaction Optimization

## Goal

Restructure the LLM layer to: centralize config, enrich Zod schemas so `withStructuredOutput` carries format guidance, remove redundant `<STRUCTURE>` blocks from prompts, split prompts into individual files, and add Markdown output instructions for longer text fields.

## Key Finding

The system already uses `withStructuredOutput` + Zod schemas for all 4 LLM interactions. The prompts contain redundant `<STRUCTURE>` blocks that duplicate what the schema defines. Removing these and enriching schema `.describe()` fields is the core improvement.

The frontend already renders `relevanceReasons` and `antifactors` with a `<Markdown>` component (`StoryPage.tsx:123,130`), so Markdown output is already supported downstream.

---

## Phase 1: Server Config File

**Create `server/src/config.ts`**
- Export typed `config` object with `llm` section:
  - `models.small` / `models.medium` / `models.large` (name + reasoningEffort)
  - `delayMs`, `preassessBatchSize`, `preassessContentMaxLength`, `assessContentMaxLength`
- Read from `process.env` with sensible defaults
- Medium model defined but not assigned to any interaction yet

**Modify `server/src/services/llm.ts`**
- Import from `config.ts` instead of reading `process.env` directly
- Add `getMediumLLM()` function
- Use `config.llm.delayMs` instead of hardcoded env var parse

---

## Phase 2: Enrich Zod Schema Descriptions

**Modify `server/src/schemas/llm.ts`**

Add detailed `.describe()` to all fields. Key additions:

- `assessResultSchema.factors`: Describe Markdown bullet format, structure of each bullet (factor name + assessment + classification + mechanism + example)
- `assessResultSchema.limitingFactors`: Describe Markdown bullet format
- `assessResultSchema.relevanceCalculation`: Describe Markdown format for calculation steps
- `assessResultSchema.relevanceSummary`: Describe Markdown formatting, 75-100 words
- `preAssessItemSchema.emotionTag`: Add the five emotion definitions to `.describe()`
- `preAssessItemSchema.rating`: Note conservative 20% threshold
- `selectResultSchema.selectedIds`: Note exact count requirement
- Title, summary, quote, marketingBlurb: Keep plain text descriptions

---

## Phase 3: Split Prompts Into Separate Files

**Create `server/src/prompts/` directory:**

| File | Contents |
|------|----------|
| `shared.ts` | `Guidelines` interface, `buildGuidelinesXml()`, `escapeXml()`, `containsChineseCharacters()` |
| `preassess.ts` | `buildPreassessPrompt()` + `StoryForPreassess` — Remove `<STRUCTURE>` block (lines 56-61) |
| `assess.ts` | `buildAssessPrompt()` — Remove `<STRUCTURE>` block (lines 203-235). Keep `<STEPS>` and `<GENERIC LIMITING FACTORS>`. Add Markdown instructions in relevant steps. |
| `select.ts` | `buildSelectPrompt()` + `StoryForSelect` — Remove `<STRUCTURE>` block (lines 296-312). Keep `<STEPS>` and guidelines. |
| `podcast.ts` | `buildPodcastPrompt()` + `StoryForPodcast` — No changes needed (no `<STRUCTURE>` block) |
| `index.ts` | Barrel re-exports all 4 builder functions |

**Modify `server/src/services/prompts.ts`** — Replace with re-exports from `../prompts/index.js` to keep all existing imports valid.

**Use config values** — Replace magic numbers (`1200`, `4000`, `10`) with config imports where applicable.

---

## Phase 4: Update Tests

**Modify `server/src/services/prompts.test.ts`**
- Remove assertions for deleted `<STRUCTURE>` block content
- Add assertions for Markdown instructions in assess prompt
- Verify `<STEPS>` and analytical content is still present

**Verify `server/src/services/analysis.test.ts`** — Should pass without changes since `services/prompts.ts` still exists as re-export barrel.

---

## Phase 5: Documentation

**Modify `.context/llm-analysis.md`** — Update with:
- Config file location for model configuration
- Three model tiers
- New prompts directory structure
- Schema-driven format guidance approach
- Markdown output for factors/limitingFactors/relevanceCalculation/relevanceSummary

**Modify `CLAUDE.md`** — Update the `.context/llm-analysis.md` entry.

---

## Files Summary

| Action | File |
|--------|------|
| CREATE | `server/src/config.ts` |
| CREATE | `server/src/prompts/shared.ts` |
| CREATE | `server/src/prompts/preassess.ts` |
| CREATE | `server/src/prompts/assess.ts` |
| CREATE | `server/src/prompts/select.ts` |
| CREATE | `server/src/prompts/podcast.ts` |
| CREATE | `server/src/prompts/index.ts` |
| MODIFY | `server/src/services/llm.ts` |
| MODIFY | `server/src/schemas/llm.ts` |
| MODIFY | `server/src/services/prompts.ts` (→ re-export barrel) |
| MODIFY | `server/src/services/prompts.test.ts` |
| MODIFY | `.context/llm-analysis.md` |
| MODIFY | `CLAUDE.md` |

---

## Verification

1. `npm run build --prefix server` — zero errors
2. `npm run test --prefix server -- --run` — all tests pass
3. Spot-check: Import `buildAssessPrompt` from both `server/src/services/prompts.ts` (re-export) and `server/src/prompts/assess.ts` (direct) — both work
4. Verify the assess prompt no longer contains `<STRUCTURE>` but still contains `<STEPS>` and `<GENERIC LIMITING FACTORS>`
5. Verify Zod schema descriptions mention Markdown for factors/limitingFactors/relevanceCalculation/relevanceSummary
