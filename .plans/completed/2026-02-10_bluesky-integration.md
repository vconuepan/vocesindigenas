# Bluesky Integration Plan

## Goal

Add automated and manual Bluesky posting to Actually Relevant. Stories can be posted to Bluesky via admin actions (single or bulk) or automatically via a cron job. Posts include LLM-generated text, a link card to our site, and an inline link to the original source article. An admin page shows all posts with engagement metrics.

---

## Decisions

| Decision | Choice |
|----------|--------|
| Authentication | App password (env vars: `BLUESKY_HANDLE`, `BLUESKY_APP_PASSWORD`) |
| Post format | ~250 char LLM text + Actually Relevant link card + inline source link |
| Auto-post cadence | Twice daily (configurable in config.ts) |
| Auto-post approval | Auto-post, no human review |
| Manual post review | Side panel on stories page |
| Bulk flow | LLM picks best story -> same review panel -> post |
| Engagement metrics | Basic counts (likes, reposts, replies, quotes), polled once daily + manual refresh |
| Admin page | Dedicated `/admin/bluesky` page |
| Link card target | Actually Relevant story page (og:image, title, description) |
| Inline link | Original source article URL |

---

## Architecture Overview

```
Manual Flow (Admin):
  StoriesPage -> "Post to Bluesky" action -> LLM generates draft -> Side panel review -> Confirm -> POST /api/admin/bluesky/posts -> Bluesky API

Bulk Flow (Admin):
  StoriesPage -> Select stories -> "Pick Best for Bluesky" -> LLM picks best -> Same review panel -> Confirm -> POST /api/admin/bluesky/posts -> Bluesky API

Auto Flow (Cron):
  bluesky_auto_post job -> Find published stories from last N hours -> Exclude already-posted -> LLM picks best -> LLM generates post text -> POST to Bluesky API -> Save record

Metrics Flow (Cron):
  bluesky_update_metrics job -> Fetch all posts from last 30 days -> Poll Bluesky API for engagement counts -> Update DB
```

---

## Phase 1: Database & Config

### 1.1 Prisma Schema — New `BlueskyPost` Model

```prisma
model BlueskyPost {
  id            String    @id @default(uuid())
  storyId       String
  story         Story     @relation(fields: [storyId], references: [id])
  postUri       String?   @unique   // at:// URI returned by Bluesky after posting
  postCid       String?              // CID (content hash) from Bluesky
  status        String    @default("draft")  // draft | published | failed
  postText      String               // The generated post text (what was/will be posted)
  error         String?              // Error message if posting failed
  publishedAt   DateTime?            // When actually posted to Bluesky
  likeCount     Int       @default(0)
  repostCount   Int       @default(0)
  replyCount    Int       @default(0)
  quoteCount    Int       @default(0)
  metricsUpdatedAt DateTime?         // Last time engagement metrics were polled
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([storyId])
  @@index([status])
  @@index([publishedAt])
}
```

Add reverse relation on `Story`:
```prisma
model Story {
  // ... existing fields
  blueskyPosts  BlueskyPost[]
}
```

### 1.2 Config — `server/src/config.ts`

Add to config object:

```typescript
bluesky: {
  handle: env('BLUESKY_HANDLE', ''),
  appPassword: env('BLUESKY_APP_PASSWORD', ''),
  serviceUrl: env('BLUESKY_SERVICE_URL', 'https://bsky.social'),
  autoPost: {
    enabled: envBool('BLUESKY_AUTO_POST_ENABLED', false),
    lookbackHours: envInt('BLUESKY_LOOKBACK_HOURS', 12),  // Look at stories published in last N hours
  },
  metrics: {
    maxAgeDays: envInt('BLUESKY_METRICS_MAX_AGE_DAYS', 30),  // Only poll metrics for posts this recent
  },
  siteBaseUrl: env('SITE_BASE_URL', 'https://actuallyrelevant.com'),
},
```

### 1.3 Migration

Generate SQL migration file for `BlueskyPost` table. Follow the database migration workflow from `.context/database-migrations.md`.

---

## Phase 2: Bluesky API Client

### 2.1 Install `@atproto/api` — `server/package.json`

```bash
npm install @atproto/api --prefix server
```

### 2.2 Bluesky Client Module — `server/src/lib/bluesky.ts`

Singleton client with lazy session creation:

```typescript
import { BskyAgent, RichText } from '@atproto/api'

// createSession() on first use, refresh on 401
// Expose:
//   - createPost(text: string, linkCardUrl: string, linkCardMeta: {...}): Promise<{uri, cid}>
//   - getPostMetrics(uri: string): Promise<{likes, reposts, replies, quotes}>
//   - getPostThread(uri: string): Promise<ThreadViewPost>
```

Key implementation details:
- **Authentication**: Call `agent.login({ identifier, password })` with app password. Cache the session. Re-authenticate on 401.
- **Rich text**: Use `RichText` class to detect facets (inline links). The source URL will be an inline link facet.
- **Link card**: Use `app.bsky.embed.external` embed with `uri`, `title`, `description`, and optionally `thumb` (fetched og:image uploaded as blob).
- **Rate limiting**: Wrap calls with `withRetry()` from `server/src/lib/retry.ts`. Add a configurable delay between posts (default: 2s).
- **Error handling**: Throw typed errors that the service layer can catch and store in `BlueskyPost.error`.

### 2.3 Link Card Metadata

For the Actually Relevant link card, we already have og:image, og:title, og:description on story pages. The client should:
1. Construct the URL: `${siteBaseUrl}/stories/${story.slug}`
2. Use the story's `title` as the card title
3. Use the story's `marketingBlurb` or `summary` as the card description
4. Fetch and upload the og:image as a blob for the thumbnail (or skip thumbnail if unavailable)

---

## Phase 3: LLM Post Generation

### 3.1 Zod Schema — `server/src/schemas/llm.ts`

```typescript
export const blueskyPostSchema = z.object({
  postText: z.string().describe(
    'Engaging social media post text for Bluesky (max 250 characters). ' +
    'Should hook readers and convey why this story matters. ' +
    'Do NOT include any URLs — links are added separately. ' +
    'Do NOT use hashtags. Write in a human, editorial voice.'
  ),
})
```

### 3.2 Prompt — `server/src/prompts/bluesky.ts`

Two prompt builders:

**`buildBlueskyPostPrompt(story)`** — Generate post text for a single story:
- Input: story title, summary, relevance reasons, quote, emotion tag, issue, source name
- Output: `blueskyPostSchema`
- Model tier: small (fast, cheap — this is a short creative task)
- Guidance: editorial voice, hook readers, max 250 chars, no URLs/hashtags

**`buildBlueskyPickBestPrompt(stories)`** — Pick the best story from a set to post:
- Input: array of stories with their metadata
- Output: `blueskyPickBestSchema` (storyId + reasoning)
- Model tier: small
- Guidance: pick the story most likely to generate engagement on Bluesky, considering timeliness, emotional appeal, broad relevance

### 3.3 Pick Best Schema — `server/src/schemas/llm.ts`

```typescript
export const blueskyPickBestSchema = z.object({
  storyId: z.string().describe('The ID of the story best suited for a Bluesky post'),
  reasoning: z.string().describe('Brief explanation of why this story was chosen (1-2 sentences)'),
})
```

---

## Phase 4: Service Layer

### 4.1 Bluesky Service — `server/src/services/bluesky.ts`

Core service functions:

```typescript
// Generate a draft post for a story (LLM call, saves to DB as draft)
export async function generateDraft(storyId: string): Promise<BlueskyPost>

// Publish a draft post to Bluesky (API call, updates DB to published)
export async function publishPost(postId: string): Promise<BlueskyPost>

// Update post text before publishing
export async function updateDraft(postId: string, postText: string): Promise<BlueskyPost>

// Delete a draft (not published posts — those stay for history)
export async function deleteDraft(postId: string): Promise<void>

// Pick the best story from a set (LLM call)
export async function pickBestStory(storyIds: string[]): Promise<{ storyId: string; reasoning: string }>

// Generate draft + pick best (combined flow for bulk action)
export async function pickAndDraft(storyIds: string[]): Promise<BlueskyPost>

// Update engagement metrics for recent posts
export async function updateMetrics(): Promise<void>

// Get all posts (for admin page)
export async function listPosts(options: { status?: string; page?: number; limit?: number }): Promise<PaginatedResult<BlueskyPost>>
```

### 4.2 Auto-Post Job Handler — `server/src/jobs/blueskyAutoPost.ts`

```typescript
export async function runBlueskyAutoPost(): Promise<void> {
  // 1. Check if bluesky is configured (handle + password present)
  // 2. Get published stories from last `config.bluesky.autoPost.lookbackHours` hours
  // 3. Exclude stories that already have a BlueskyPost record
  // 4. If no candidates, log and return
  // 5. Call pickBestStory() with candidate IDs
  // 6. Call generateDraft() for the winner
  // 7. Call publishPost() for the draft (no human review in auto mode)
  // 8. Log success with post URI
}
```

### 4.3 Metrics Job Handler — `server/src/jobs/blueskyUpdateMetrics.ts`

```typescript
export async function runBlueskyUpdateMetrics(): Promise<void> {
  // 1. Get all published BlueskyPosts where publishedAt is within last `config.bluesky.metrics.maxAgeDays` days
  // 2. For each post, call getPostMetrics(postUri)
  // 3. Update like/repost/reply/quote counts in DB
  // 4. Update metricsUpdatedAt timestamp
  // 5. Log summary
}
```

### 4.4 Register Jobs — `server/src/jobs/handlers.ts`

```typescript
export const JOB_HANDLERS: Record<string, () => Promise<void>> = {
  // ... existing handlers
  bluesky_auto_post: runBlueskyAutoPost,
  bluesky_update_metrics: runBlueskyUpdateMetrics,
}
```

### 4.5 Seed Job Rows

Add to migration or seed:
```sql
INSERT INTO job_runs (id, job_name, cron_expression, enabled)
VALUES
  (gen_random_uuid(), 'bluesky_auto_post', '0 9,18 * * *', false),
  (gen_random_uuid(), 'bluesky_update_metrics', '0 3 * * *', false);
```

Both disabled by default — admin enables after configuring credentials.

---

## Phase 5: API Routes

### 5.1 Admin Bluesky Routes — `server/src/routes/admin/bluesky.ts`

```
POST   /api/admin/bluesky/posts/generate     # Generate draft from storyId
POST   /api/admin/bluesky/posts/pick-and-draft # Pick best from storyIds[], generate draft
PUT    /api/admin/bluesky/posts/:id           # Update draft text
POST   /api/admin/bluesky/posts/:id/publish   # Publish draft to Bluesky
DELETE /api/admin/bluesky/posts/:id           # Delete draft
GET    /api/admin/bluesky/posts               # List all posts (paginated, filterable by status)
GET    /api/admin/bluesky/posts/:id           # Get single post with story details
POST   /api/admin/bluesky/metrics/refresh     # Manually trigger metrics update
```

### 5.2 Request/Response Schemas — `server/src/schemas/bluesky.ts`

Zod schemas for all request bodies and response types. Include `.openapi()` metadata for API docs.

### 5.3 Route Registration — `server/src/routes/admin/index.ts`

Mount bluesky router at `/bluesky`.

---

## Phase 6: Admin UI — Stories Page Integration

### 6.1 New Bulk Action — `BulkActionsBar.tsx`

Add "Post to Bluesky" button (single story selected) and "Pick Best for Bluesky" button (multiple stories selected). Both are visible only when the selection contains published stories.

### 6.2 Story Action — Single Story

When one published story is selected and "Post to Bluesky" is clicked:
1. Call `POST /api/admin/bluesky/posts/generate` with `{ storyId }`
2. Open `BlueskyDraftPanel` (side panel) with the generated draft
3. Panel shows: editable post text, character count, preview of how the card will look, story title/source for reference
4. "Post" button calls `POST /api/admin/bluesky/posts/:id/publish`
5. "Cancel" deletes the draft

### 6.3 Bulk Action — Pick Best

When multiple published stories are selected and "Pick Best for Bluesky" is clicked:
1. Call `POST /api/admin/bluesky/posts/pick-and-draft` with `{ storyIds }`
2. Open the same `BlueskyDraftPanel` with the generated draft
3. Panel additionally shows: "Selected from X stories — [reasoning]"
4. Same confirm/cancel flow as single story

### 6.4 BlueskyDraftPanel — `client/src/components/admin/BlueskyDraftPanel.tsx`

Side panel component (matches `EditPanel` pattern from `ClusterDetail.tsx`):
- Editable textarea with live grapheme counter (warn at 280, error at 300)
- Preview card showing: title, description, thumbnail mock
- Source link preview
- Story context: title, issue, relevance rating
- Buttons: "Post to Bluesky" (primary), "Cancel" (secondary)
- Loading state while generating/publishing

---

## Phase 7: Admin UI — Bluesky Page

### 7.1 Route — `/admin/bluesky`

New lazy-loaded admin page: `client/src/pages/admin/BlueskyPage.tsx`

### 7.2 Page Layout

**Header**: "Bluesky Posts" title + "Refresh Metrics" button

**Stats Bar** (top): Total posts, avg likes, avg reposts, last posted date

**Posts Table**:
| Column | Content |
|--------|---------|
| Story | Title + issue label |
| Post Text | Truncated post text |
| Status | Draft / Published / Failed (with error tooltip) |
| Posted | Relative timestamp |
| Likes | Count |
| Reposts | Count |
| Replies | Count |
| Quotes | Count |
| Metrics Updated | Relative timestamp |

Clickable rows open a detail panel showing full post text, story link, Bluesky post link, and engagement metrics.

**Filters**: Status dropdown (all/draft/published/failed)

### 7.3 Admin Navigation

Add "Bluesky" link to admin sidebar/navigation.

---

## Phase 8: Testing

### 8.1 Server Tests

- **`bluesky.test.ts`** (lib): Mock `@atproto/api`, test session creation, post creation, rich text facet generation, link card embedding, metrics fetching, error handling, retry on 401
- **`bluesky.service.test.ts`**: Mock Bluesky client + Prisma, test generateDraft (LLM mock), publishPost, updateDraft, deleteDraft, pickBestStory, updateMetrics, auto-post job logic
- **`bluesky.routes.test.ts`**: Supertest route tests for all admin endpoints

### 8.2 Client Tests

- **`BlueskyDraftPanel.test.tsx`**: Render with mock data, test character counter, edit text, confirm/cancel actions
- **`BlueskyPage.test.tsx`**: Render table with mock posts, test filters, test metrics refresh button

---

## Phase 9: Documentation

### 9.1 Context File — `.context/bluesky.md`

Document:
- Authentication setup (app password, env vars)
- Post generation flow (LLM prompt, schema, format)
- Auto-post job configuration
- Metrics polling
- Rate limits and considerations
- API endpoints
- File locations

### 9.2 Update `CLAUDE.md`

Add `.context/bluesky.md` reference with summary line.

### 9.3 Update OpenAPI Spec

Add bluesky admin endpoints to `server/src/lib/openapi.ts`.

---

## Implementation Order

1. **Phase 1**: Database schema + config (foundation)
2. **Phase 2**: Bluesky API client (can test independently)
3. **Phase 3**: LLM prompts + schemas (can test independently)
4. **Phase 4**: Service layer + job handlers (ties 1-3 together)
5. **Phase 5**: API routes (exposes service to frontend)
6. **Phase 6**: Stories page integration (manual posting flow)
7. **Phase 7**: Bluesky admin page (monitoring + metrics)
8. **Phase 8**: Tests (throughout, TDD where practical)
9. **Phase 9**: Documentation

Phases 2 and 3 can be done in parallel. Phase 8 (tests) runs alongside each phase, not as a final step.

---

## Dependencies

- `@atproto/api` npm package (server)
- Environment variables: `BLUESKY_HANDLE`, `BLUESKY_APP_PASSWORD`
- Optional: `SITE_BASE_URL` (defaults to `https://actuallyrelevant.com`)

## Risk Notes

- **App password deprecation**: Bluesky is moving toward OAuth but has not set a deprecation timeline for app passwords. If deprecated, we'd need to implement the OAuth flow (Phase 2 replacement only — rest of the system stays the same).
- **Rate limits**: 5,000 points/hour, 35,000 points/day. At 3 points per post, we'd need 1,666 posts/hour to hit the limit. With twice-daily auto-posting + occasional manual posts, we're nowhere near this.
- **Post character limit**: 300 graphemes. Links in the embed don't count. Inline source link text does count. LLM prompt targets 250 chars max to leave room.
- **og:image for link card**: Requires fetching and uploading the image as a blob. If the story page's og:image is unavailable, we post without a thumbnail (card still shows title + description).
