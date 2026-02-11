# Bluesky Feed View in Admin

## Goal

Merge live Bluesky API feed into the admin Bluesky page, so posts not generated through the app are also visible in one unified table.

## Current State

- Admin Bluesky page shows only `bluesky_posts` DB records (app-generated posts)
- Posts made manually on Bluesky are invisible
- Server has a Bluesky client (`lib/bluesky.ts`) with session management and retry logic

## Approach: Merged Table

Replace the current DB-only data source with a Bluesky API-first approach that enriches results with DB data.

### Data Flow

1. Fetch author's feed from Bluesky API (cursor-based pagination)
2. Cross-reference returned post URIs against `bluesky_posts` DB table
3. Enrich matched posts with story info and tracked status
4. Prepend draft/failed posts from DB (first page only — they aren't on Bluesky yet)
5. Render in a unified table

### Table Columns

| Column | Tracked (DB) Posts | Untracked (API-only) Posts |
|--------|-------------------|---------------------------|
| Post Text | Full text + story name subtitle | Full text |
| Source | "Tracked" badge (green) | — |
| Posted | Timestamp | Timestamp |
| Engagement | L R C Q | L R C Q |
| Actions | View on Bluesky + Delete | View on Bluesky |

### Filter Buttons

- **All** — API feed + DB drafts/failed at top
- **Tracked** — Only posts in both API and DB
- **Untracked** — Only API posts not in DB
- **Draft** — DB drafts only
- **Failed** — DB failed only

### Pagination

- API-based views: cursor-based with "Load More" button
- DB-only views (Draft, Failed): offset-based pagination (existing)

## Files to Modify

| File | Change |
|------|--------|
| `server/src/lib/bluesky.ts` | Add `getAuthorFeed()` function |
| `server/src/routes/admin/bluesky.ts` | Add `GET /feed` route |
| `server/src/schemas/bluesky.ts` | Add feed query schema |
| `shared/types/index.ts` | Add `BlueskyFeedItem` type |
| `client/src/lib/admin-api.ts` | Add `getFeed()` method |
| `client/src/pages/admin/BlueskyPage.tsx` | Rewrite to use merged feed view |
| `.context/bluesky.md` | Document new feed endpoint |

## Out of Scope

- Deleting/editing untracked posts from admin
- Importing untracked posts into DB
- Background sync job
