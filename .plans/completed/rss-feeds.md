# RSS Feeds for Public Content

## Requirements

Provide all published stories as RSS 2.0 feeds, accessible without authentication:

- **Global feed** — All published stories across all issues
- **Per-issue feeds** — One feed per issue slug (includes child-issue stories)
- **Content** — AI-generated summary as item description, linking to the story page on the site
- **Discoverability** — HTML `<link>` autodiscovery tags in `<head>` + visible RSS icon/links in the UI

## Implementation Plan

### Phase 1: Server — RSS feed endpoint

**Install dependency:**
- `feed` npm package (generates valid RSS 2.0 / Atom / JSON Feed XML)

**New file: `server/src/routes/public/feed.ts`**
- `GET /api/feed` — Global RSS feed (all published stories, most recent 50)
- `GET /api/feed/:issueSlug` — Per-issue RSS feed (published stories for that issue, most recent 50)

Both endpoints:
1. Query published stories using `storyService.getPublishedStories()` (reuse existing service)
2. Build RSS 2.0 XML using the `feed` library
3. Set `Content-Type: application/rss+xml; charset=utf-8`
4. Set `Cache-Control: public, max-age=900` (15 min cache)
5. Return the XML string

**Feed metadata:**
- Title: "Actually Relevant" (or "Actually Relevant — {Issue Name}" for per-issue)
- Description: site tagline
- Link: site URL (from `FRONTEND_URL` env var)
- Language: `en`

**Item fields:**
- `title` — Story title (AI-generated)
- `link` — `{FRONTEND_URL}/stories/{id}`
- `description` — Story summary (markdown stripped to plain text, or kept as HTML)
- `pubDate` — `datePublished`
- `guid` — Story ID (permalink: false) or the story URL
- `category` — Issue name

**Register in `server/src/routes/public/index.ts`:**
- Add `router.use('/feed', feedRouter)`

### Phase 2: Client — Autodiscovery tags

**Modify `client/index.html`:**
- Add `<link rel="alternate" type="application/rss+xml" title="Actually Relevant RSS Feed" href="/api/feed" />` in `<head>`

**Modify `client/src/pages/IssuePage.tsx`** (per-issue pages):
- Use `react-helmet-async` to add a per-issue `<link rel="alternate">` tag pointing to `/api/feed/{slug}`

### Phase 3: Client — Visible RSS links

**Modify `client/src/layouts/PublicLayout.tsx`:**
- Add an RSS link in the footer "Subscribe" section: `{ label: 'RSS Feed', href: '/api/feed' }`
- Use a small RSS icon (inline SVG) next to the link

**Modify `client/src/pages/IssuePage.tsx`:**
- Add a small RSS icon/link near the issue heading that links to `/api/feed/{slug}`

## Files Changed

| File | Change |
|------|--------|
| `server/package.json` | Add `feed` dependency |
| `server/src/routes/public/feed.ts` | **New** — RSS feed route handler |
| `server/src/routes/public/index.ts` | Register feed router |
| `client/index.html` | Add global RSS autodiscovery `<link>` |
| `client/src/pages/IssuePage.tsx` | Per-issue autodiscovery + visible RSS link |
| `client/src/layouts/PublicLayout.tsx` | RSS link in footer |

## Notes

- No authentication required — feeds are fully public
- Rate limiting already applies to all `/api/*` routes
- The `feed` npm package handles RSS 2.0 XML generation and escaping
- 50-item limit per feed keeps response size reasonable while covering recent content
- 15-minute cache header avoids excessive DB queries from feed readers polling frequently
