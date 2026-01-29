# LLM Analysis Pipeline

The analysis pipeline uses LangChain + OpenAI to evaluate story relevance through three stages. All stages use `withStructuredOutput` + Zod schemas for reliable parsing.

## Model Configuration

| Stage | Model | Reasoning Effort | Purpose |
|-------|-------|-----------------|---------|
| Pre-assessment | `gpt-5-mini` | `low` | Batch screening: conservative rating + emotion tag |
| Full assessment | `gpt-5.2` | `medium` | Detailed analysis: factors, ratings, summary, blurb |
| Selection | `gpt-5-mini` | `low` | Comparative ranking to pick top 50% |

Models are configurable via environment variables:
- `OPENAI_MODEL_SMALL` — default `gpt-5-mini` (pre-assess, select)
- `OPENAI_MODEL_LARGE` — default `gpt-5.2` (full assess)
- `LLM_DELAY_MS` — rate limit delay between calls (default 1000ms)

## Three Stages

### 1. Pre-assessment (Batch)

Screens multiple stories per LLM call (~10 per batch, fewer for Chinese text). Produces a conservative rating (1-10) and emotion tag per story.

**Zod schema**: `preAssessResultSchema` — array of `{ articleId, rating, emotionTag }`

**Emotion tags**: uplifting, surprising, frustrating, scary, calm

**Threshold**: Only stories rated >= 3 proceed to full assessment.

### 2. Full Assessment (Individual)

Detailed analysis of a single story. Produces 13 structured fields covering relevance factors, limiting factors, ratings, scenarios, summary, title, and marketing blurb.

**Zod schema**: `assessResultSchema` — the largest schema, with `.describe()` annotations guiding the LLM on field formats and constraints.

**Prompt**: ~500 lines, ported from the PHP reference (`chatgpt.php`). Includes the full rating algorithm, generic limiting factors (opinion pieces, click-bait, early-stage tech, etc.), and detailed output structure specifications.

### 3. Selection (Batch)

Takes all recently analyzed stories, formats them as XML with their AI metadata, and asks the LLM to select the top 50% through pairwise comparison rounds.

**Zod schema**: `selectResultSchema` — `{ selectedIds: string[] }`

**Method**: The prompt instructs the LLM to go through rounds, selecting the most relevant and discarding the least relevant in each round, until the target count is reached.

## Issue-Specific Guidelines

Each Issue (topic category) has three prompt sections stored in the database:
- `promptFactors` — relevance factors specific to this topic
- `promptAntifactors` — topic-specific limiting factors
- `promptRatings` — rating criteria (1-10 scale definitions)

These are injected into all three prompt templates as `<FACTORS>`, `<TOPIC-SPECIFIC LIMITING FACTORS>`, and `<CRITERIA>` XML sections.

## Modifying Prompts

Prompt templates live in `server/src/services/prompts.ts`. The three builders are:
- `buildPreassessPrompt(stories, guidelines)` — batch screening
- `buildAssessPrompt(title, content, publisher, url, guidelines)` — full analysis
- `buildSelectPrompt(stories, toSelect)` — pairwise selection

To change the output format, update both the prompt template AND the corresponding Zod schema in `server/src/schemas/llm.ts`. The schema field names and descriptions directly affect what the LLM produces.

## Key Files

| File | Role |
|------|------|
| `server/src/services/llm.ts` | LLM client: `getSmallLLM()`, `getLargeLLM()`, rate limiting |
| `server/src/services/prompts.ts` | Three prompt builders |
| `server/src/services/analysis.ts` | Orchestration: preAssessStories, assessStory, selectStories |
| `server/src/schemas/llm.ts` | Zod schemas for all three LLM output formats |
| `.to-migrate/models/chatgpt.php` | Original PHP prompts (reference only) |
