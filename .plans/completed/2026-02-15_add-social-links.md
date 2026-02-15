# Add Bluesky & Mastodon Links (Website + Newsletter)

## Goal

Add links to the Actually Relevant Bluesky and Mastodon accounts in two places:
1. The website footer ("Connect" column)
2. The newsletter HTML template (footer section)

## Social accounts

- **Bluesky:** `actuallyrelevant.bsky.social` → `https://bsky.app/profile/actuallyrelevant.bsky.social`
- **Mastodon:** `https://mastodon.social/@actuallyrelevant`

## Changes

### 1. Website footer — `client/src/layouts/PublicLayout.tsx`

Add two new `<li>` items to the "Connect" column `<ul>`, after the RSS Feed link (line ~641) and before the "For Your Website" link. This keeps social links grouped at the top of the Connect section right after RSS.

Each link:
- External `<a>` with `target="_blank"` and `rel="noopener noreferrer"`
- Inline SVG icon (Bluesky butterfly, Mastodon elephant head) matching the existing icon style (`w-3.5 h-3.5 shrink-0`, `fill="currentColor"`)
- Same CSS classes as existing Connect links
- `<span className="sr-only">(opens in new tab)</span>` for accessibility
- Also add `rel="me"` on the Mastodon link (Mastodon verification convention)

### 2. Newsletter template — `server/src/services/newsletter.ts`

Add a "Follow us" row in the footer section (between the site link and the unsubscribe link, around line 574). Use small `<img>` icons hosted at `actuallyrelevant.news/images/social/` (same pattern as feed favicons and logo). Each icon gets meaningful `alt` text so links remain usable if images don't load.

```html
<img src=".../bluesky.png" alt="Bluesky" width="16" height="16"> Bluesky
·
<img src=".../mastodon.png" alt="Mastodon" width="16" height="16"> Mastodon
```

Styled to match the existing footer aesthetic (12px, centered, neutral color). Icons are 16x16 inline-block with vertical-align middle, matching the feed favicon pattern.

### 3. Constants

Add `BLUESKY_URL` and `MASTODON_URL` constants next to the existing `KOFI_URL` in `PublicLayout.tsx`. For the newsletter, hardcode the URLs inline (same pattern as the existing Ko-fi and site links there).

## Out of scope

- About page (personal profile links, not the brand's social accounts)
- ShareButtons component (that's for sharing individual stories)

## Files modified

| File | Change |
|------|--------|
| `client/src/layouts/PublicLayout.tsx` | Add constants + two `<li>` items in footer |
| `server/src/services/newsletter.ts` | Add follow links row in email footer |

## Testing

- Visual check of footer links in dev server
- Build check (`npm run build --prefix client` and `npm run build --prefix server`)
- No unit tests needed — these are static links with no logic
