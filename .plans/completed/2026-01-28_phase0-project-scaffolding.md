# Phase 3: LLM Relevance Analysis — Implementation Plan

## Overview

Add AI-powered story analysis using LangChain + OpenAI. Stories flow through: pre-assessment (batch, lightweight) → full assessment (individual, detailed) → selection (pairwise comparison). Prompts are ported from the PHP `chatgpt.php` reference. Uses LangChain's `withStructuredOutput` + Zod schemas for reliable parsing.

## Model Configuration

Use GPT-5 reasoning models instead of legacy GPT-4o. These models use `reasoning.effort` instead of `temperature`.

| Task | Model | Reasoning Effort | Rationale |
|------|-------|-----------------|-----------|
| Pre-assessment (batch) | `gpt-5-mini` | `low` | Lightweight screening, conservative ratings |
| Full assessment | `gpt-5.2` | `medium` | Detailed analysis needs deeper reasoning |
| Selection | `gpt-5-mini` | `low` | Comparative ranking, structured output |

**LangChain config** — `@langchain/openai` 1.2.3 supports `reasoning` natively on `ChatOpenAI`:
```typescript
const llm = new ChatOpenAI({
  model: 'gpt-5-mini',
  reasoning: { effort: 'low' },
})
```

Supported effort values: `none`, `minimal`, `low`, `medium`, `high`, `xhigh`.

**Environment variables**:
- `OPENAI_API_KEY` — required
- `OPENAI_MODEL_SMALL` — default `gpt-5-mini` (preassess, select)
- `OPENAI_MODEL_LARGE` — default `gpt-5.2` (full assess)

## Architecture Decision

**Structured output vs text parsing**: The PHP version uses free-text prompts and regex parsing. We'll use a hybrid approach:
- **Pre-assessment**: Use `withStructuredOutput` + Zod (clean structured response for rating + emotion tag)
- **Full assessment**: Use free-text prompt (the ~500-line prompt produces interconnected prose fields that don't suit rigid JSON extraction). Parse with regex like the PHP version, store raw response text in `aiResponse` field, and extract individual fields into dedicated columns.
- **Selection**: Use `withStructuredOutput` + Zod (just needs an array of selected IDs)

## Steps

### Step 1: LLM client service

Create `server/src/services/llm.ts` — thin wrapper around ChatOpenAI.

```typescript
// Two model tiers:
//   getSmallLLM()  — gpt-5-mini, reasoning effort 'low' (preassess, select)
//   getLargeLLM()  — gpt-5.2, reasoning effort 'medium' (full assess)
// Model names configurable via OPENAI_MODEL_SMALL / OPENAI_MODEL_LARGE env vars
// Both use reasoning: { effort } instead of temperature (GPT-5 reasoning models)
// Rate limiting: simple delay between calls (LLM_DELAY_MS env, default 1000ms)
// Exports: getSmallLLM(), getLargeLLM()
```

### Step 2: Prompt templates

Create `server/src/services/prompts.ts` — all prompt text ported from PHP `chatgpt.php`.

Three prompt builders:
- `buildPreassessPrompt(stories, guidelines)` — batch pre-screening prompt. Stories formatted as `Article ID: / Title: / Content (1200 chars)`. Guidelines = issue's factors/antifactors/ratings XML sections.
- `buildAssessPrompt(title, content, publisher, url, guidelines)` — full assessment prompt (~500 lines). Content truncated to 4000 chars. Includes the full rating algorithm, generic limiting factors, and output structure specification.
- `buildSelectPrompt(stories, toSelect)` — pairwise selection prompt. Stories formatted as XML `<ARTICLE><ID>/<Title>/<Summary>/<Relevance>/<Antifactors>/<Calculation></ARTICLE>`.

### Step 3: Response parsing

Create `server/src/services/responseParser.ts` — extract structured fields from full assessment free-text response.

Port all regex extractors from PHP `chatgpt.php` lines 400-464:
- `getPublicationDate(text)` → `"Publication date: (.+?)(?:\n|$)"`
- `getSummary(text)` → `"Article summary: (.+?)(?:\n|$)"`
- `getQuote(text)` → `"Quote: (.+?)(?:\n|$)"`
- `getRelevanceSummary(text)` → `"Relevance summary: (.+?)(?:\n|$)"`
- `getTitle(text)` → `"Relevance title: (.+?)(?:\n|$)"`
- `getMarketingBlurb(text)` → `"Marketing blurb: (.+?)(?:\n|$)"`
- `getKeywords(text)` → `"Keywords: (.+?)(?:\n|$)"` → split by comma
- `getRatingLow(text)` → `"Conservative rating:\s+(\d+)"`
- `getRatingHigh(text)` → `"Speculative rating:\s+(\d+)"`
- `getFactors(text)` → bullet points from "Factors" section
- `getAntifactors(text)` → bullet points from "Limiting factors" section
- `getCalculation(text)` → bullet points from "Relevance calculation" section
- `getScenarios(text)` → bullet points from "Scenarios" section

### Step 4: Zod schemas for structured LLM output

Create `server/src/schemas/llm.ts`:

```typescript
// Pre-assessment (per article in batch)
const preAssessItemSchema = z.object({
  articleId: z.string(),
  rating: z.number().int().min(1).max(10),
  emotionTag: z.enum(['uplifting', 'surprising', 'frustrating', 'scary', 'calm']),
})
const preAssessResultSchema = z.object({
  articles: z.array(preAssessItemSchema),
})

// Selection
const selectResultSchema = z.object({
  selectedIds: z.array(z.string()),
})
```

### Step 5: Analysis service

Create `server/src/services/analysis.ts` — core analysis orchestration.

Methods:
- `preAssessStories(storyIds: string[])` — batch pre-analysis
  - Fetch stories with feed+issue data (need issue's prompt sections)
  - Group by issue (same guidelines per batch)
  - For each issue batch: build prompt, call LLM with structured output
  - Update each story: `relevanceRatingLow`, `emotionTag`, `status = 'pre_analyzed'`
  - Batch size: ~10 articles per call (adjust for Chinese content)

- `assessStory(storyId: string)` — full individual assessment
  - Fetch story + feed + issue
  - Build guidelines from issue (factors/antifactors/ratings XML)
  - Build full assessment prompt (4000 char content limit)
  - Call LLM (free text, temperature 0.3)
  - Parse response with responseParser extractors
  - Update story: all `ai*` fields, `relevanceRatingLow`, `relevanceRatingHigh`, `status = 'analyzed'`
  - Store full response text as `aiResponse` JSON

- `selectStories(storyIds: string[])` — pairwise selection
  - Fetch analyzed stories with their AI metadata
  - Build selection prompt (select 50% rounded up, fraction = 0.5)
  - Call LLM with structured output (temperature 0.1)
  - Selected stories → `status = 'selected'`
  - Unselected stories → `status = 'rejected'`

### Step 6: Job handlers

Update the three placeholder job files:

**`server/src/jobs/preassessStories.ts`**:
- Query all stories with `status = 'fetched'`
- Call `preAssessStories(ids)` in batches of ~10
- Log summary

**`server/src/jobs/assessStories.ts`**:
- Query stories with `status = 'pre_analyzed'` AND `relevanceRatingLow >= 3` (threshold for full assessment)
- Call `assessStory(id)` sequentially for each (rate limiting)
- Log summary

**`server/src/jobs/selectStories.ts`**:
- Query recent `analyzed` stories (e.g., last 48 hours)
- Call `selectStories(ids)`
- Log summary

### Step 7: Admin API endpoints

Add to `server/src/routes/admin/stories.ts`:

- `POST /api/admin/stories/preassess` — trigger pre-assessment for stories with given IDs or all fetched stories
  - Body: `{ storyIds?: string[] }` (optional; if omitted, preassess all fetched)
  - Returns: `{ processed: number, results: { storyId, rating, emotionTag }[] }`

- `POST /api/admin/stories/:id/assess` — trigger full assessment for single story
  - Returns: the updated story object

- `POST /api/admin/stories/select` — trigger selection on given story IDs
  - Body: `{ storyIds: string[] }`
  - Returns: `{ selected: string[], rejected: string[] }`

- `POST /api/admin/stories/:id/publish` — manually set status to `published`
- `POST /api/admin/stories/:id/reject` — manually set status to `rejected`

### Step 8: Story service additions

Add to `server/src/services/story.ts`:

- `getStoriesByStatus(status, options?)` — query stories by status with optional filters (issue, date range, rating min)
- `getStoriesWithIssue(ids)` — fetch stories joined with feed→issue for prompt building
- `updateStoryAnalysis(id, data)` — update all AI fields in one call
- `publishStory(id)` / `rejectStory(id)` — status transitions

### Step 9: Tests

All tests mock the LLM — no real API calls.

**New test files:**
- `server/src/services/responseParser.test.ts` — test each regex extractor with sample LLM output text
- `server/src/services/prompts.test.ts` — test prompt builders produce expected structure (contains guidelines, article content, correct format)
- `server/src/services/analysis.test.ts` — test orchestration (mock LLM, mock Prisma, verify correct fields written)
- `server/src/jobs/preassessStories.test.ts` — test job handler calls analysis service correctly
- `server/src/jobs/assessStories.test.ts` — same pattern
- `server/src/jobs/selectStories.test.ts` — same pattern

**Update existing test:**
- `server/src/routes/admin/stories.test.ts` — add tests for new endpoints (preassess, assess, select, publish, reject)

### Step 10: Build, verify, commit

- `npm run build --prefix server` — TypeScript clean
- `npm run test --prefix server -- --run` — all tests pass
- Commit: "Phase 3: LLM relevance analysis pipeline"

## Key Files

| File | Action |
|------|--------|
| `server/src/services/llm.ts` | Create |
| `server/src/services/prompts.ts` | Create |
| `server/src/services/responseParser.ts` | Create |
| `server/src/services/analysis.ts` | Create |
| `server/src/schemas/llm.ts` | Create |
| `server/src/services/story.ts` | Modify (add query helpers) |
| `server/src/jobs/preassessStories.ts` | Rewrite |
| `server/src/jobs/assessStories.ts` | Rewrite |
| `server/src/jobs/selectStories.ts` | Rewrite |
| `server/src/routes/admin/stories.ts` | Modify (add endpoints) |
| `server/src/schemas/story.ts` | Modify (add preassess/select body schemas) |

## Magic Numbers (from PHP, adapted for GPT-5)

| Constant | Value | Used In |
|----------|-------|---------|
| Preassess content truncation | 1200 chars | preassess prompt |
| Preassess batch size | ~10 articles | preassess batching |
| Preassess model | `gpt-5-mini` | LLM call |
| Preassess reasoning effort | `low` | LLM call |
| Assess content truncation | 4000 chars | assess prompt |
| Assess model | `gpt-5.2` | LLM call |
| Assess reasoning effort | `medium` | LLM call |
| Select fraction | 0.5 (ceil) | selection |
| Select model | `gpt-5-mini` | LLM call |
| Select reasoning effort | `low` | LLM call |
| Full assessment threshold | rating >= 3 | assessStories job |
| Rating range | 1-10 integers | all prompts |
| Emotion tags | 5 options | preassess only |
| LLM delay between calls | 1000ms default | rate limiting |

## Verification

- `npm run build --prefix server` succeeds
- `npm run test --prefix server -- --run` — all tests pass (new + existing)
- Manual test: call `POST /api/admin/stories/preassess` with test story IDs (requires OPENAI_API_KEY)
