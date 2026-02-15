# Mastodon Posts: Show Original Article in Link Preview

## Problem

Mastodon posts currently include the AR story URL (`actuallyrelevant.news/stories/slug`). Mastodon auto-generates a link preview card from the **first URL** in the post text. Since the first (and only) URL points to AR, the card shows AR's branded `og-image.png` — a generic site logo. The editorial text refers to a story the reader can't see without clicking through.

**Current format:**
```
[editorial hook — why this matters]
Issue | Emotion | found on Publisher
https://actuallyrelevant.news/stories/some-slug
```
Card preview: AR logo + "Actually Relevant" title. No article context.

## Solution

Add the **original article URL** (`story.sourceUrl`) as the first URL in the post, and keep the AR story URL as a secondary link. Mastodon auto-generates a card from the **first URL** in the post text, so the card will show the original article's `og:title`, `og:description`, and `og:image`. The AR URL remains as a plain-text link for readers who want the full curation.

**New format:**
```
[editorial hook — why this matters]
Issue | Emotion | found on Publisher
https://original-source.com/the-article
https://actuallyrelevant.news/stories/some-slug
```
Card preview: Original article's image, title, and description. AR link available as plain text.

## Changes

### 1. `server/src/services/mastodon.ts`

**`assemblePostText`** — Add `sourceUrl` (original article URL) as the first URL, keep `storyUrl` (AR URL) as the second URL. New format: `blurb\nmetaLine\nsourceUrl\nstoryUrl`.

**`calcMaxBlurbChars`** — Account for both URLs' lengths in the character budget calculation (subtract both URL lengths + 3 newlines instead of 2).

**`generateDraft`** — Pass `story.sourceUrl` alongside the existing AR story URL.

**`publishPost`** — No changes needed (it uses the stored `postText` as-is).

### 2. `server/src/prompts/mastodon.ts`

Minor wording update: the prompt currently says "readers already see it in the link preview" — this is now more accurate since the card will actually show the original article's og:description.

### 3. `server/src/services/mastodon.test.ts`

Update tests to verify `sourceUrl` appears in assembled text instead of the AR story URL.

### 4. `server/src/prompts/mastodon.test.ts`

If any tests assert on prompt wording, update accordingly.

### 5. `.context/mastodon.md`

Update the "Post Format" section to reflect the new URL strategy.

### 6. `.specs/social-posting.allium`

Update the `GenerateDraft` rule's `assemble` call and `overhead` to reflect the use of `sourceUrl` instead of `storyUrl`.

## Character budget impact

Adding the original article URL (~80-120 chars) alongside the AR URL (~50-60 chars) reduces the editorial text budget by the source URL length + 1 newline (~80-120 chars). Given the 500-char limit, this still leaves ~220-300 characters for the editorial hook — enough for a compelling post, though tighter than before.

## Scope exclusions

- No changes to Bluesky posting (it uses its own explicit link card embed, not auto-detection)
- No changes to the admin UI (the draft panel shows `postText` as-is, which will now contain the source URL)
- No database migration needed
- No changes to the auto-post job (it calls `generateDraft` + `publishPost` which handle everything)
