# Story Pipeline

Stories are the core entity. They flow through a status pipeline from crawling to publication, driven by scheduled jobs and manual admin actions.

## Status Flow

```
fetched → pre_analyzed → analyzed → selected → published
                                  ↘ rejected
                       ↘ trashed
```

### Status Definitions

| Status | Set By | Meaning |
|--------|--------|---------|
| `fetched` | Crawler | Content extracted from RSS feed. Ready for LLM screening. |
| `pre_analyzed` | Pre-assess job | Batch LLM screening assigned a conservative rating (1-10) and emotion tag. |
| `analyzed` | Assess job | Full LLM analysis complete: detailed factors, ratings, summary, blurb, etc. |
| `selected` | Select job | LLM chose this story for publication from the analyzed pool. |
| `published` | Admin action | Live on the public site. |
| `rejected` | Select job or admin | Not relevant enough, or manually excluded. |
| `trashed` | Admin action | Soft-deleted. |

### Transition Rules

- **fetched → pre_analyzed**: Pre-assess job first assigns each story to an issue via LLM (nano model), then groups stories by assigned issue and batch pre-screens them (~10 per batch) using the medium model.
- **pre_analyzed → analyzed**: Assess job picks stories with `relevancePre >= 3`. Stories rated 1-2 stay as `pre_analyzed` and are effectively filtered out.
- **analyzed → selected/rejected**: Select job takes all `analyzed` stories with `relevance >= config.selection.relevanceMin` (default 5) and selects ~`config.selection.ratio` (default 50%, rounded up). The rest become `rejected`. When there are more than `config.selection.maxGroupSize` (default 20) candidates, they are split into roughly equal groups and each group is sent to the LLM separately (e.g. 25 stories → 2 groups of 13 + 12).
- **selected → published**: Publish job or manual admin action. The `publish_stories` job publishes all `selected` stories, sets `datePublished` if not already set, and generates a URL slug if the story doesn't have one yet.
- **Any → trashed**: Admin can trash any story at any time.

### Slugs

Stories get a URL slug (e.g. `ai-breakthrough-in-protein-folding`) when they are first published. Slugs are **immutable by default** — changing the title of a published story does not regenerate the slug, preserving existing URLs. Admins can manually edit a slug via the story edit form.

**Generation rules:**
- Created from `title` (falls back to `sourceTitle`) using `server/src/utils/slugify.ts`
- Lowercase, hyphens only, max 80 chars (truncated at word boundary)
- Duplicates resolved by appending `-2`, `-3`, etc. (checked via `generateUniqueSlug()` in `story.ts`)
- Stored as `slug String? @unique` — nullable because unpublished stories don't have one

**Where slugs are set:** `updateStory()`, `updateStoryStatus()`, `bulkUpdateStatus()`, and `publishStory()` in `server/src/services/story.ts` — all check `!story.slug` before generating.

**Public routing:** `/stories/:slug` — the public API and client both use slug-based URLs exclusively.

### Automated Jobs

| Job | Schedule | What It Does |
|-----|----------|--------------|
| `crawl_feeds` | Every 6 hours | Fetches RSS feeds, extracts content, creates stories as `fetched` |
| `preassess_stories` | Configurable | Batch pre-screens all `fetched` stories |
| `assess_stories` | Configurable | Full analysis on `pre_analyzed` stories with rating >= 3 |
| `select_stories` | Configurable | Selects top ~50% of `analyzed` stories with `relevance >= 5` (both configurable via `config.selection.*`), batched into groups of ≤20 |
| `publish_stories` | Configurable | Publishes all `selected` stories, sets `datePublished` if not already set |

### Manual Admin Endpoints

| Endpoint | Effect |
|----------|--------|
| `POST /api/admin/stories/preassess` | Trigger pre-assessment (optional story IDs) |
| `POST /api/admin/stories/:id/assess` | Trigger full assessment for one story |
| `POST /api/admin/stories/select` | Trigger selection on given story IDs |
| `POST /api/admin/stories/:id/publish` | Set status to `published` |
| `POST /api/admin/stories/:id/reject` | Set status to `rejected` |

## Key Files

| File | Role |
|------|------|
| `server/src/services/story.ts` | CRUD, filtering, status transitions |
| `server/src/services/analysis.ts` | LLM orchestration (preassess, assess, select) |
| `server/src/jobs/preassessStories.ts` | Scheduled pre-assessment |
| `server/src/jobs/assessStories.ts` | Scheduled full assessment |
| `server/src/jobs/selectStories.ts` | Scheduled selection |
| `server/src/jobs/publishStories.ts` | Scheduled publishing |
| `server/src/routes/admin/stories.ts` | Admin API endpoints |
| `server/src/routes/public/stories.ts` | Public API (published stories only) |

## Story Fields

Stories carry both crawled data and AI-generated analysis:

**Source data** (set during crawl): `sourceUrl`, `sourceTitle`, `sourceContent`, `sourceDatePublished`, `dateCrawled`, `feedId`, `crawlMethod`

**Issue assignment** (set during pre-assessment): `issueId` — the LLM-assigned issue for this story. Set by `assignIssuesToStories()` as the first step of pre-assessment. Falls back to `feed.issueId` if the LLM returns an invalid slug. Downstream code uses `story.issue ?? story.feed.issue` for issue lookup.

**Platform data**: `title` (AI-generated, nullable), `slug` (generated on publish), `datePublished` (set on first publish)

**Pre-assessment fields** (set during batch LLM screening):
- `relevancePre` — conservative rating (1-10), immutable after set
- `emotionTag` — one of: uplifting, surprising, frustrating, scary, calm

**Full assessment fields** (set during in-depth LLM analysis):
- `relevance` — single relevance rating (1-10)
- `summary` — 40-70 word summary
- `quote` — key quote with attribution
- `quoteAttribution` — speaker name/title, organization name, or "Original article" for non-quotes
- `marketingBlurb` — up to 230 chars, starts with publisher name
- `relevanceReasons` — detailed factor bullet points (newline-separated)
- `antifactors` — limiting factor bullet points (newline-separated)
- `relevanceCalculation` — rating calculation steps (newline-separated)
