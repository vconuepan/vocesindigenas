# Feed Favicons

Display a small favicon next to each feed's title in story cards and the story detail page. Favicons are fetched via an admin action and stored as static assets in the client.

## Approach

- **Source:** Google Favicon API (`https://www.google.com/s2/favicons?domain=example.com&sz=32`) — reliable, always returns a PNG, no HTML parsing needed.
- **Storage:** `client/public/images/feeds/{feedId}.png` — served as static Vite assets. No server-side static file serving needed.
- **Format:** 32x32 PNG.
- **Admin triggers:** Per-feed "Fetch Favicon" button + bulk "Fetch All Favicons" action on the feeds page.

## Key Design Decision: No Database Field

Since favicons are stored at a predictable path (`/images/feeds/{feedId}.png`), the client can construct the URL from the feed ID alone. No new database column or schema change is needed. If the file doesn't exist, the `<img>` uses an `onError` fallback (hide itself or show a generic icon).

However, the `PublicStory` type currently only includes `feed.title` and `feed.issue.{name, slug}` — it does **not** include `feed.id`. We need to add `feed.id` to `PUBLIC_STORY_SELECT` and the `PublicStory` type so the client can construct the favicon URL.

## Implementation Phases

### Phase 1: Admin Backend — Favicon Fetch Endpoint

**Files to modify:**
- `server/src/routes/admin/feeds.ts` — Add two endpoints:
  - `POST /api/admin/feeds/:id/favicon` — Fetch favicon for a single feed. Extracts domain from the feed's RSS URL, hits Google Favicon API, saves the PNG to `client/public/images/feeds/{feedId}.png`. Returns `{ success: true }` or error.
  - `POST /api/admin/feeds/fetch-favicons` — Bulk fetch favicons for all active feeds. Iterates feeds, calls the single-feed logic for each, returns `{ succeeded: number, failed: number, errors: string[] }`.

**New utility (inline or small helper):**
- Extract domain from feed URL using `new URL(feedUrl).hostname`.
- Fetch `https://www.google.com/s2/favicons?domain={hostname}&sz=32`.
- Write the response buffer to `client/public/images/feeds/{feedId}.png`.
- Use `path.resolve()` to find the client/public directory relative to the server (use a config constant or `__dirname`-based resolution).

**Edge cases:**
- Google Favicon API returns a generic globe icon for unknown domains — this is acceptable as a fallback.
- Ensure the `client/public/images/feeds/` directory exists (create if missing).

### Phase 2: Shared Types — Add Feed ID to PublicStory

**Files to modify:**
- `shared/types/index.ts` — Add `id: string` to the `PublicStory.feed` type.
- `server/src/services/story.ts` — Add `id: true` to `PUBLIC_STORY_SELECT.feed.select`.

### Phase 3: Client — Favicon Component

**Files to create:**
- `client/src/components/FeedFavicon.tsx` — Small component:
  ```tsx
  function FeedFavicon({ feedId }: { feedId: string }) {
    return (
      <img
        src={`/images/feeds/${feedId}.png`}
        alt=""
        width={16}
        height={16}
        className="inline-block rounded-sm"
        onError={(e) => { e.currentTarget.style.display = 'none' }}
      />
    )
  }
  ```
  - `alt=""` because the feed name is already displayed as text (decorative image).
  - `onError` hides the image if the favicon file doesn't exist yet.
  - 16x16 display size (32x32 source for retina sharpness).

### Phase 4: Client — Display Favicons in Story Cards and Story Page

**Files to modify:**
- `client/src/components/StoryCard.tsx` — In the `StoryMeta` component, add `<FeedFavicon>` before `story.feed.title`. This automatically covers all 4 card variants (featured, horizontal, equal, compact).
- `client/src/pages/StoryPage.tsx` — In the metadata section where it says "Based on {feed.title}", add `<FeedFavicon>` before the feed title link.

### Phase 5: Admin UI — Favicon Fetch Buttons

**Files to modify:**
- `client/src/components/admin/FeedEditPanel.tsx` — Add a "Fetch Favicon" button in the edit panel. Shows a small preview of the current favicon (if exists) and a button to fetch/refresh it. Uses a mutation that calls `POST /api/admin/feeds/:id/favicon`.
- `client/src/pages/admin/FeedsPage.tsx` — Add a "Fetch All Favicons" button next to the existing "Crawl All" button. Uses a mutation calling `POST /api/admin/feeds/fetch-favicons`. Shows progress/result toast.
- `client/src/lib/admin-api.ts` (or wherever admin API calls live) — Add the two new API call functions.

## File Path Resolution

The server needs to write files into `client/public/images/feeds/`. In production on Render, the client is pre-built and deployed separately, so favicon fetching should be done **before** deploying the client (or the favicons need to be committed to the repo). Options:

1. **Commit favicons to the repo** (recommended) — After fetching, the developer commits the new PNG files. This way they're part of the client build and deploy naturally.
2. Alternatively, the server could write to a shared volume, but that adds deployment complexity.

For the admin endpoint, we'll resolve the path relative to the project root. In dev, the server runs from `server/` so we go up one level to reach `client/public/`. We can use an environment variable `FAVICON_DIR` with a sensible default.

## Out of Scope

- Automatic favicon refresh on a schedule.
- Custom favicon upload per feed.
- SVG or ICO format support.
- Favicon display in admin feed table (can be added later).

## Risks

- **Low:** Google Favicon API may be rate-limited for bulk fetches — mitigate with small delays between requests.
- **Low:** Some feeds may not have recognizable favicons — the `onError` fallback handles this gracefully.
- **Low:** Path resolution between server and client directories — use a configurable `FAVICON_DIR` with a default.
