# Public Personalization

## Goal

Give readers more control over what they see, beyond the positivity slider. Increase engagement and return visits by tailoring content to individual preferences.

## Current State

- **Positivity slider** exists (5 positions, localStorage-persisted, client-side filtering)
- **No user accounts** — all personalization must be anonymous/localStorage-based or account-based
- **Embeddings exist** on all published stories — can power "more like this"
- **Issues have hierarchy** — 4 parent issues with child sub-topics
- **Newsletter subscription** exists but has no preference options
- **No reading history** tracked

## Key Design Decision: Account-Based vs Anonymous

### Option A: Anonymous Personalization (localStorage only)

All preferences stored in the browser. No accounts needed.

**What's possible:**
- Preferred issues (show more of these on homepage)
- Reading history (mark "read" stories, suggest unread)
- "More like this" on story pages (using embedding similarity)
- Saved/bookmarked stories (localStorage list of story IDs)
- Hide/dismiss stories

**Pros:** Zero friction, no auth complexity, no database changes for user data, GDPR-simple.
**Cons:** Lost on device switch or browser clear. No cross-device sync. Can't personalize newsletter. Limited analytics on what users actually want.

### Option B: Lightweight Accounts (email-based)

Users sign up with email (could piggyback on newsletter subscription). Preferences stored server-side.

**What's possible (everything from A, plus):**
- Cross-device sync
- Personalized newsletter digest (only issues they follow)
- Email notifications for high-relevance stories in their topics
- Reading history persisted
- "Your weekly summary" personalized email

**Pros:** Persistent, cross-device, enables personalized email. Builds user base for growth metrics.
**Cons:** Auth complexity (though simpler than full accounts — magic link or password). GDPR obligations (data deletion, export). More backend work.

### Option C: Progressive Enhancement (A → B)

Start with anonymous (localStorage), offer optional account creation to "save your preferences."

**Pros:** Best of both worlds. Users get value immediately, accounts are opt-in.
**Cons:** Need to handle migration from localStorage → account. Two code paths initially.

## Chosen Approach

**Option C: Progressive Enhancement** — start with a focused set of localStorage features, design the data model so it can later sync to accounts.

## Implementation Plan

### Phase 1: Anonymous Features (localStorage)

#### 1. Reading history

Track which stories the user has opened in localStorage.

**Key:** `ar-read-stories` → `Set<storySlug>` (serialized as JSON array)
**Max size:** Cap at 500 entries (FIFO eviction)
**UI:** Subtle "read" indicator on story cards (e.g., slightly dimmed title, small checkmark)

**File:** `client/src/lib/reading-history.ts`

```typescript
export function markAsRead(slug: string): void
export function isRead(slug: string): boolean
export function getReadSlugs(): Set<string>
```

#### 2. Topic preferences

Let users indicate which issues they're most interested in.

**Key:** `ar-preferred-issues` → `string[]` (issue slugs)
**UI:** Small "customize" button/link near the homepage issue sections, or a one-time preference prompt after N visits
**Effect:** Reorder homepage issue sections so preferred issues appear first. Non-preferred issues still appear, just lower.

**File:** `client/src/lib/preferences.ts`

```typescript
export function getPreferredIssues(): string[]
export function setPreferredIssues(slugs: string[]): void
export function hasSetPreferences(): boolean
```

#### 3. Saved/bookmarked stories

Allow users to save stories for later reading.

**Key:** `ar-saved-stories` → `string[]` (story slugs)
**Max size:** Cap at 100 entries
**UI:** Bookmark icon on story cards and story page header. Saved stories accessible via a `/saved` page (or a dropdown/panel).

**Note:** Since data is localStorage-only, show a notice: "Saved stories are stored in this browser. Create an account to sync across devices." (for future Phase 2)

#### 4. "Show me more like this" on story pages

A link/button on each story page that triggers a semantic search for similar stories.

**Implementation:** Navigate to `/search?related={storySlug}` — the search page fetches the story's embedding and finds similar published stories.

**Alternatively:** A dedicated "Related Stories" section at the bottom of the story page showing 3-4 similar stories (separate plan exists for this).

### Phase 2: Optional Accounts (Future)

#### 5. Magic-link authentication

- User enters email → receives a login link (no password)
- Creates a `public_user` record in DB (separate from admin `users` table)
- JWT-based session (similar to admin auth but different role/scope)

#### 6. Sync localStorage → account

On first login, migrate localStorage preferences to the account. On subsequent visits, load from server.

#### 7. Personalized newsletter

During subscription (or in account settings), let users select which issues to receive stories about. Newsletter generation filters stories by subscriber preferences.

**Requires:** Changes to Plunk integration (segments or per-user email content) or a custom email send loop.

### Phase 3: Smart Recommendations (Future)

#### 8. Collaborative filtering

"Users who read stories like X also read Y." Requires enough user reading data to be meaningful.

#### 9. Homepage personalization

Instead of static issue order, dynamically weight homepage sections based on:
- Explicit preferences (issue selection)
- Implicit signals (reading history — which issues do they click most?)

## Decisions

- **Phase 1 scope:** All four features (reading history, saved stories, topic preferences, "more like this")
- **Homepage reordering:** Yes — preferred issues move to the top of the homepage
- **Saved stories:** Full page at `/saved`
- **Account system:** Deferred to Phase 2 (not in initial scope)
- **Privacy notice:** TBD at implementation time

## Files to Create/Modify (Phase 1)

| File | Action |
|------|--------|
| `client/src/lib/reading-history.ts` | Create — reading history utilities |
| `client/src/lib/preferences.ts` | Create — topic preferences + saved stories |
| `client/src/components/StoryCard.tsx` | Add "read" indicator + bookmark button |
| `client/src/pages/StoryPage.tsx` | Add bookmark button + "more like this" link |
| `client/src/pages/SavedPage.tsx` | Create — saved stories page |
| `client/src/pages/HomePage.tsx` | Reorder issues by preference (optional) |
| `client/src/App.tsx` | Add `/saved` route |
| `client/src/routes.ts` | Add `/saved` to routes |

## Estimated Scope

Phase 1: Medium — 2-3 new utility files, 1 new page, modifications to 3-4 components. ~400 lines of code.
Phase 2: Large — auth system, DB schema, sync logic, newsletter changes.
