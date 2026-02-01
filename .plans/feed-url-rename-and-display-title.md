# Feed URL Rename & Display Title

## Requirements

1. **Rename `url` → `rssUrl`**: The current `url` field on Feed holds the RSS feed URL. Rename it to `rssUrl` (DB column: `rss_url`) to clarify its purpose.
2. **Add `url` field**: New optional field pointing to the source's homepage (e.g., `https://reuters.com`).
3. **Favicon priority**: Use the new `url` (homepage) for favicon fetching, falling back to `rssUrl` if `url` is null.
4. **Add `displayTitle` field**: New optional field (DB column: `display_title`) for a public-facing name.
5. **Public UI**: Show `displayTitle` with fallback to `title` wherever feed names appear publicly (StoryCard, StoryPage, HomePage hero).

## Implementation Plan

### Phase 1: Database Migration

**File:** `server/prisma/schema.prisma`

- Rename `url` field to `rssUrl` with `@map("rss_url")`
- Add `url String? @map("url")` (nullable — existing feeds won't have it yet)
- Add `displayTitle String? @map("display_title")` (nullable)
- Keep the `@unique` constraint on `rssUrl` (not on `url`)

**Migration SQL** (manual, per project workflow):

```sql
ALTER TABLE feeds RENAME COLUMN url TO rss_url;
ALTER TABLE feeds ADD COLUMN url TEXT;
ALTER TABLE feeds ADD COLUMN display_title TEXT;
```

### Phase 2: Server — Types, Schemas, Services

**`shared/types/index.ts`**
- `Feed` interface: rename `url` → `rssUrl`, add `url: string | null`, add `displayTitle: string | null`
- `PublicStory.feed`: add `displayTitle: string | null` (for public display fallback)
- `Story.feed`: add `displayTitle` too

**`server/src/schemas/feed.ts`**
- `createFeedSchema`: rename `url` → `rssUrl`, add optional `url`, add optional `displayTitle`
- `updateFeedSchema`: same changes

**`server/src/services/feed.ts`**
- `createFeed`: update data type to accept `rssUrl` instead of `url`, plus new fields
- `updateFeed`: update partial data type

**`server/src/services/story.ts`** (`PUBLIC_STORY_SELECT`)
- Add `displayTitle: true` to the `feed.select` block so public queries return it

**`server/src/services/favicon.ts`**
- `fetchFavicon`: accept optional `homeUrl` parameter; use it as primary hostname source, fall back to `feedUrl` (rssUrl)
- `fetchAllFavicons`: pass `feed.url` (homepage) alongside `feed.rssUrl`

**`server/src/routes/admin/feeds.ts`**
- Favicon endpoint: pass `feed.url` (homepage) and `feed.rssUrl` to `fetchFavicon`
- P2002 unique error message: update to say "RSS URL" instead of "URL"

**`server/src/services/crawler.ts`**
- Line 34: change `feed.url` → `feed.rssUrl`

### Phase 3: Client — Admin UI

**`client/src/components/admin/FeedEditPanel.tsx`**
- `buildFormState`: add `rssUrl`, `url`, `displayTitle` fields (rename from `url`)
- Form: rename URL input label to "RSS URL", add "Homepage URL" input, add "Display Title" input
- `toPayload`: map new fields

**`client/src/components/admin/FeedForm.tsx`** (create dialog)
- Rename `url` form field to `rssUrl`, add `url` and `displayTitle` inputs
- Update `createFeed.mutateAsync` payload

**`client/src/components/admin/FeedTable.tsx`**
- External link icon: change `href={feed.url}` → `href={feed.url || feed.rssUrl}` (link to homepage if available, else RSS URL)
- Title column: show `feed.displayTitle || feed.title` if desired (optional — admin may want to always see internal title)

### Phase 4: Client — Public UI

All public pages show `displayTitle ?? title` as the feed attribution:

**`client/src/components/StoryCard.tsx`** (StoryMeta)
- Change `{story.feed.title}` → `{story.feed.displayTitle || story.feed.title}`

**`client/src/pages/StoryPage.tsx`**
- Line 195: same change for the "Based on..." attribution

**`client/src/pages/HomePage.tsx`**
- Line 55: same change for the hero section feed name

### Phase 5: Tests

- Update any existing feed-related tests that reference `url` → `rssUrl`
- Verify favicon service uses homepage URL as primary

### Phase 6: Build Verification

- `npm run build --prefix server`
- `npm run test --prefix server -- --run`
- `npm run build --prefix client`
- `npm run test --prefix client -- --run`

## Decisions

- `rssUrl` keeps `@unique`; `url` (homepage) is NOT unique (multiple feeds can share a homepage)
- Admin table external link stays pointing to `rssUrl` (the RSS feed)
- Admin table shows internal `title`; only public UI uses `displayTitle ?? title`
- Migration SQL will need to be run manually per the project's migration workflow
