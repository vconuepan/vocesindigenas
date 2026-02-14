# Mastodon Integration Plan

## Goal

Add Mastodon as a second social media channel for automated and manual posting, reusing as much logic as possible from the existing Bluesky integration while keeping channels independently configurable.

## Current State

The Bluesky integration covers:
- **API client** (`lib/bluesky.ts`) — AT Protocol auth, post creation with rich text facets + link card embeds, metrics polling, author feed
- **Service layer** (`services/bluesky.ts`) — Draft generation via LLM, story picking via LLM, publishing, metrics update, feed merging
- **Prompts** (`prompts/bluesky.ts`) — Two prompts: `buildBlueskyPostPrompt` (editorial hook) and `buildBlueskyPickBestPrompt` (pick best story)
- **Auto-post job** (`jobs/blueskyAutoPost.ts`) — Finds recent published stories, excludes already-posted, picks best via LLM, generates draft, publishes
- **Admin UI** — Draft panel, Bluesky feed page, bulk action buttons on StoriesPage
- **Database** — `bluesky_posts` table with status (draft/published/failed), metrics, AT Protocol identifiers

## Key Differences: Bluesky vs Mastodon

| Aspect | Bluesky | Mastodon |
|--------|---------|----------|
| Auth | App password + session | Static access token (never expires) |
| Character limit | 300 graphemes | 500 characters (instance-dependent) |
| Link previews | Must build embed manually (upload thumb, attach card) | Auto-generated from og:tags in URL |
| Links in text | Not needed (link card handles it) | Include URL in post text |
| Rich text | Facets (byte-range annotations) | Plain text with inline URLs/hashtags |
| Visibility | N/A (all public) | `unlisted` recommended for bots |
| Post identifier | AT URI (`at://...`) + CID | Status ID + URL |
| Metrics | likeCount, repostCount, replyCount, quoteCount | favouritesCount, reblogsCount, repliesCount |
| Package | `@atproto/api` | `masto` (masto.js) |
| Deletion | `deletePost(uri)` | `statuses.$select(id).remove()` |

## Architecture Design

### What to share vs keep separate

**Shared (extract from Bluesky-specific code):**
1. **Story picking** — `pickBestStory` logic is platform-agnostic (picks based on content quality, not platform). Extract so both channels can call it, and the auto-post job only picks once.
2. **Candidate finding** — The auto-post job's logic for finding recently published stories and excluding already-posted ones. Generalize to check both `bluesky_posts` and `mastodon_posts`.
3. **Post text generation prompt structure** — The editorial hook prompt is similar for both. Parameterize by channel constraints (max chars, whether to include URLs).

**Channel-specific (separate per platform):**
1. **API client** — Completely different protocols (`@atproto/api` vs `masto`)
2. **Publishing logic** — Bluesky needs rich text facets + link card embed; Mastodon just posts plain text with URLs
3. **Metrics fetching** — Different APIs, different metric names
4. **Feed view** — Bluesky has a merged API+DB feed view; Mastodon can have its own or skip this initially
5. **Database table** — Separate tables avoid risky migration of existing data

### Database

New `mastodon_posts` table (parallel structure to `bluesky_posts`):

```
mastodon_posts:
  id              UUID PK
  story_id        FK → stories
  status_id       String? UNIQUE  (Mastodon status ID, set after publish)
  status_url      String?         (Public URL, set after publish)
  status          String          (draft | published | failed)
  post_text       String          (Generated/edited post text)
  error           String?
  published_at    DateTime?
  favourite_count Int DEFAULT 0
  boost_count     Int DEFAULT 0
  reply_count     Int DEFAULT 0
  metrics_updated_at DateTime?
  created_at      DateTime
  updated_at      DateTime
```

### Post Format for Mastodon

```
{editorial hook}
{issue} | {emotion} | found on {publisher}
{story URL}
```

- Character budget: 500 chars total minus metadata line, URL (~50 chars), and newlines
- URL is included in the text (Mastodon auto-generates preview card from it)
- No hashtags initially (can add later based on issue/emotion mapping)
- `visibility: "unlisted"` for bot etiquette
- `language: "en"`

### Auto-Post Job (Shared)

The current `bluesky_auto_post` job becomes a generic `social_auto_post` job:

1. Check which channels are enabled (Bluesky, Mastodon)
2. If no channels enabled, skip
3. Find recently published stories (same lookback window)
4. Exclude stories that already have posts on ALL enabled channels
5. Pick best story via LLM (**one call**, not per-channel)
6. For each enabled channel that hasn't posted this story:
   a. Generate channel-specific draft text
   b. Publish immediately (auto mode)
7. Delay between channel publishes (`postDelayMs`)

This means one LLM pick call serves both channels. Text generation is still per-channel (different char limits and format) but could potentially reuse the same editorial angle.

### Manual Posting (Admin UI)

**Decision: Separate buttons per channel.**
- "Post to Bluesky" and "Post to Mastodon" as separate bulk actions
- Each opens its own draft panel
- Simple to implement; admin can post to one channel without the other
- Can upgrade to a unified "Post to Social" flow later if warranted

## Implementation Steps

### Phase 1: Backend Foundation

1. **Install `masto` package** (`npm install masto --prefix server`)

2. **Add config** (`server/src/config.ts`):
   ```
   mastodon: {
     instanceUrl: MASTODON_URL (e.g., 'https://mastodon.social')
     accessToken: MASTODON_TOKEN
     autoPost.enabled: MASTODON_AUTO_POST_ENABLED (default false)
     metrics.maxAgeDays: MASTODON_METRICS_MAX_AGE_DAYS (default 30)
     postModelTier: 'medium'
     visibility: 'unlisted'
   }
   ```

3. **Create Mastodon API client** (`server/src/lib/mastodon.ts`):
   - `isMastodonConfigured()` — check credentials
   - `createStatus(text, options)` — post a status with visibility and language
   - `getStatusMetrics(statusId)` — fetch engagement counts
   - `deleteStatus(statusId)` — delete a status
   - `getAccountStatuses(options)` — fetch account's statuses (for merged feed view, paginated)
   - Wrap all calls in `withRetry()` from existing retry utility
   - Client instantiation: `createRestAPIClient({ url, accessToken })` — no session management needed (token never expires)

4. **Database migration** — New `mastodon_posts` table + Prisma model

5. **Create Mastodon prompts** (`server/src/prompts/mastodon.ts`):
   - `buildMastodonPostPrompt(story, maxChars)` — similar to Bluesky but with Mastodon-specific constraints (500 chars, URL will be appended)
   - Reuse `buildBlueskyPickBestPrompt` for story picking (rename or alias to `buildSocialPickBestPrompt`)

6. **Create Mastodon service** (`server/src/services/mastodon.ts`):
   - `generateDraft(storyId)` — LLM text generation with Mastodon constraints
   - `assemblePostText(parts)` — assemble editorial hook + metadata + story URL
   - `publishPost(postId)` — publish via Mastodon API
   - `updateDraft(postId, text)` — edit draft
   - `deletePostRecord(postId)` — delete (from Mastodon API + DB)
   - `updateMetrics()` — poll engagement
   - `listPosts()` / `getPostById()` — standard CRUD
   - `getFeed(options)` — merged API+DB feed (fetch account statuses, cross-reference with DB, include drafts/failed)

### Phase 2: Shared Social Media Logic

7. **Extract shared picking logic** (`server/src/services/socialMedia.ts`):
   - `findAutoPostCandidates(lookbackHours)` — finds published stories, excludes those already posted to any channel
   - `pickBestStoryForSocial(candidateIds)` — wraps the existing `pickBestStory` (or we keep it in the Bluesky service and import it, since it's already platform-agnostic)

8. **Refactor auto-post job** → `jobs/socialAutoPost.ts`:
   - Replaces `blueskyAutoPost.ts`
   - Calls shared candidate-finding and picking
   - Iterates over enabled channels (Bluesky, Mastodon)
   - Generates and publishes per channel
   - Registers as `social_auto_post` in job handlers (keep `bluesky_auto_post` as alias or migrate job name in DB)

9. **Add Mastodon metrics job** (`jobs/mastodonUpdateMetrics.ts`) — or fold into a shared `socialUpdateMetrics` job

### Phase 3: API Routes

10. **Create Mastodon admin routes** (`server/src/routes/admin/mastodon.ts`):
    - Mirror the Bluesky route structure under `/api/admin/mastodon/`
    - `GET /feed` — merged API+DB feed (cursor-based pagination)
    - `GET /posts`, `GET /posts/:id`, `POST /posts/generate`, `POST /posts/pick-and-draft`
    - `PUT /posts/:id`, `POST /posts/:id/publish`, `DELETE /posts/:id`
    - `POST /metrics/refresh`

11. **Register routes** in `server/src/routes/admin/index.ts`

### Phase 4: Admin UI

12. **Add Mastodon bulk actions** to `BulkActionsBar`:
    - "Post to Mastodon" / "Pick Best for Mastodon" buttons (same pattern as Bluesky)
    - Check `singleHasMastodonPost` to disable when already posted

13. **Create `MastodonDraftPanel`** (or make `BlueskyDraftPanel` generic as `SocialDraftPanel`):
    - Same structure: editable text, character counter (500 chars), publish button
    - No link card preview needed (Mastodon auto-generates from URL in post text)
    - If reusing BlueskyDraftPanel, parameterize: `charLimit`, `channelName`, `showLinkPreview`

14. **Add Mastodon page** (`client/src/pages/admin/MastodonPage.tsx`):
    - Merged API+DB feed view (like BlueskyPage): fetch Mastodon account statuses, cross-reference with DB
    - Shows tracked vs untracked posts, drafts/failed at top
    - Filters: All, Tracked, Untracked, Draft, Failed
    - Manual metrics refresh

15. **Update `StoriesPage`** to handle Mastodon actions alongside Bluesky

16. **Update shared types** (`shared/types/index.ts`) with `MastodonPost` interface

17. **Update admin API client** (`client/src/lib/admin-api.ts`) with Mastodon endpoints

18. **Add admin nav link** for Mastodon page in `AdminLayout`

### Phase 5: Documentation & Cleanup

19. **Create `.context/mastodon.md`** — document the integration
20. **Update `.context/bluesky.md`** — reference the shared social media patterns
21. **Update `CLAUDE.md`** — add Mastodon context file reference
22. **Move plan to completed**

## Files to Create

| File | Purpose |
|------|---------|
| `server/src/lib/mastodon.ts` | Mastodon API client (auth, posting, metrics) |
| `server/src/services/mastodon.ts` | Service layer (drafts, publishing, metrics) |
| `server/src/services/socialMedia.ts` | Shared social media logic (candidate finding, story picking) |
| `server/src/schemas/mastodon.ts` | Zod schemas for API validation |
| `server/src/prompts/mastodon.ts` | LLM prompt for Mastodon post text |
| `server/src/routes/admin/mastodon.ts` | Admin API routes |
| `server/src/jobs/socialAutoPost.ts` | Shared auto-post cron job |
| `server/src/jobs/mastodonUpdateMetrics.ts` | Mastodon metrics polling job |
| `client/src/pages/admin/MastodonPage.tsx` | Admin Mastodon overview |
| `client/src/components/admin/MastodonDraftPanel.tsx` | Draft review panel |
| `.context/mastodon.md` | Integration documentation |

## Files to Modify

| File | Change |
|------|--------|
| `server/src/config.ts` | Add `mastodon` config section |
| `server/prisma/schema.prisma` | Add `MastodonPost` model |
| `server/src/jobs/handlers.ts` | Register new jobs |
| `server/src/jobs/blueskyAutoPost.ts` | Refactor → shared social auto-post |
| `server/src/routes/admin/index.ts` | Mount Mastodon routes |
| `server/src/prompts/index.ts` | Export Mastodon prompts |
| `shared/types/index.ts` | Add Mastodon types |
| `client/src/lib/admin-api.ts` | Add Mastodon API methods |
| `client/src/components/admin/BulkActionsBar.tsx` | Add Mastodon buttons |
| `client/src/pages/admin/StoriesPage.tsx` | Handle Mastodon actions |
| `client/src/layouts/AdminLayout.tsx` | Add nav link |
| `client/src/App.tsx` | Add route |
| `CLAUDE.md` | Add context file reference |

## Design Decisions (Resolved)

1. **Auto-post job**: Unified `social_auto_post` — one job picks a story once via LLM, then posts to all enabled channels.
2. **Manual posting UX**: Separate buttons per channel ("Post to Bluesky", "Post to Mastodon"). Can upgrade to unified flow later.
3. **Post text generation**: Separate LLM calls per channel with channel-specific prompts (different char limits, URL inclusion, audience tuning).
4. **Admin feed view**: Merged API+DB feed for Mastodon (same pattern as Bluesky page).

## Open Question

- **Mastodon instance**: Which instance will you use? (mastodon.social, newsie.social, etc.) This doesn't affect code but determines the `MASTODON_URL` env var.
