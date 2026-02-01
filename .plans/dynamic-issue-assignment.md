# Plan: Dynamic Issue Assignment + Model Tier Restructuring

## Summary

Two related changes:
1. **Model tier restructuring**: small → gpt-5-nano, current small callers → medium, podcast → large
2. **Dynamic issue assignment**: LLM classifies each story into an issue during pre-assessment (instead of hardcoded feed→issue link)

---

## Phase 1: Model Tier Restructuring

### 1.1 Update config defaults — `server/src/config.ts`
- Change `small.name` default: `'gpt-5-mini'` → `'gpt-5-nano'`
- Add config keys:
  - `llm.issueAssignBatchSize: 10`
  - `llm.issueAssignContentMaxLength: 600`
  - `concurrency.issueAssign: 10`

### 1.2 Add `getMediumLLM()` — `server/src/services/llm.ts`
- Add `_mediumLLM` singleton + `getMediumLLM()` function (same pattern as existing)
- Export it

### 1.3 Switch callers to new tiers

| Caller | File:Line | From | To |
|---|---|---|---|
| Pre-assessment | `analysis.ts:75` | `getSmallLLM()` | `getMediumLLM()` |
| Podcast script | `podcast.ts:97` | `getSmallLLM()` | `getLargeLLM()` |

---

## Phase 2: Database Migration

### 2.1 Update Prisma schema — `server/prisma/schema.prisma`
Add to `Story` model:
```prisma
issueId   String?  @map("issue_id")
issue     Issue?   @relation(fields: [issueId], references: [id])
```
Add to `Issue` model:
```prisma
stories   Story[]
```
Add index: `@@index([issueId])` on Story

### 2.2 Generate and apply migration
- `npm run db:migrate --prefix server -- --name add_story_issue_id --create-only`
- Ask user to run SQL in pgAdmin, then resolve
- Ask user to stop dev server, then run `db:generate`

---

## Phase 3: Issue Assignment Implementation

### 3.1 Zod schema — `server/src/schemas/llm.ts`
```typescript
export const issueAssignItemSchema = z.object({
  articleId: z.string().describe('The article ID exactly as provided in the input'),
  issueSlug: z.string().describe('The slug of the most relevant issue from the provided list'),
})
export const issueAssignResultSchema = z.object({
  articles: z.array(issueAssignItemSchema).describe('One entry per article in the input batch'),
})
```

### 3.2 Prompt builder — `server/src/prompts/issueAssign.ts` (new file)
- `buildIssueAssignPrompt(stories, issues)` — XML-structured prompt
- Lists all issues as `<ISSUE slug="..." name="...">description</ISSUE>`
- Lists articles with ID, title, content snippet (truncated to `issueAssignContentMaxLength`)
- Task: classify each article into the single best-fit issue

### 3.3 Export from `server/src/prompts/index.ts`

### 3.4 Issue assignment function — `server/src/services/analysis.ts`

New function `assignIssuesToStories(stories, onProgress?)`:
1. Fetch all issues: `prisma.issue.findMany({ select: { id, slug, name, description } })`
2. Build `slugToId` map
3. Batch stories by `config.llm.issueAssignBatchSize`
4. Per batch: `getSmallLLM().withStructuredOutput(issueAssignResultSchema)` (nano model)
5. Map `issueSlug` → `issueId`, persist on each story
6. Fall back to `story.feed.issueId` if LLM returns invalid slug
7. Return `Map<storyId, issueId>`

### 3.5 Integrate into `preAssessStories` — `server/src/services/analysis.ts`

Updated flow:
```
1. Fetch stories (with feed.issue)
2. Call assignIssuesToStories(stories)         ← NEW [nano]
3. Group stories by assigned issueId (fallback: feed.issueId)
4. Fetch issue guidelines for each group
5. Batch pre-assessment per issue group         ← EXISTING [now medium]
6. Persist ratings + status
```

### 3.6 Update downstream to prefer `story.issueId`

Add helper:
```typescript
function resolveIssue(story: { issue?: Issue | null; feed: { issue: Issue } }): Issue {
  return story.issue ?? story.feed.issue
}
```

Update these locations:
- `analysis.ts:159` — `assessStory` guidelines lookup
- `podcast.ts:86` — category name
- `feed.ts:58,104` — RSS category

Each Prisma query at these locations needs `include: { issue: true }` added to the Story include.

---

## Phase 4: Tests

- **Prompt test**: `server/src/prompts/issueAssign.test.ts` — validates prompt structure
- **Assignment test**: mock `getSmallLLM` returning issue slugs, verify DB updates
- **Updated pre-assess test**: mock both nano (assignment) and medium (pre-assess) calls
- **Podcast test**: update mock from `getSmallLLM` to `getLargeLLM`

---

## Phase 5: Documentation

- Update `.context/llm-analysis.md` — three-tier model structure, new issue assignment step
- Update `.context/story-pipeline.md` — dynamic issue assignment, `story.issueId` precedence
- Update `CLAUDE.md` context entries if needed

---

## Verification

1. `npm run build --prefix server` — zero errors
2. `npm run test --prefix server -- --run` — all tests pass
3. Manual: trigger pre-assessment on a few stories, verify `issueId` is populated on the stories
4. Manual: verify `assessStory` uses the story's assigned issue guidelines
