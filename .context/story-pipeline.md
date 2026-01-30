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

- **fetched → pre_analyzed**: Pre-assess job processes all `fetched` stories in batches of ~10.
- **pre_analyzed → analyzed**: Assess job picks stories with `relevancePre >= 3`. Stories rated 1-2 stay as `pre_analyzed` and are effectively filtered out.
- **analyzed → selected/rejected**: Select job takes stories analyzed in the last 48 hours and selects ~50% (rounded up). The rest become `rejected`.
- **selected → published**: Manual admin action only. No auto-publish.
- **Any → trashed**: Admin can trash any story at any time.

### Automated Jobs

| Job | Schedule | What It Does |
|-----|----------|--------------|
| `crawl_feeds` | Every 6 hours | Fetches RSS feeds, extracts content, creates stories as `fetched` |
| `preassess_stories` | Configurable | Batch pre-screens all `fetched` stories |
| `assess_stories` | Configurable | Full analysis on `pre_analyzed` stories with rating >= 3 |
| `select_stories` | Configurable | Selects top 50% of recently `analyzed` stories |

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
| `server/src/routes/admin/stories.ts` | Admin API endpoints |
| `server/src/routes/public/stories.ts` | Public API (published stories only) |

## Story Fields

Stories carry both crawled data and AI-generated analysis:

**Source data** (set during crawl): `sourceUrl`, `sourceTitle`, `sourceContent`, `sourceDatePublished`, `dateCrawled`, `feedId`, `crawlMethod`

**Platform data**: `title` (AI-generated, nullable), `datePublished` (set on first publish)

**Pre-assessment fields** (set during batch LLM screening):
- `relevancePre` — conservative rating (1-10), immutable after set
- `emotionTag` — one of: uplifting, surprising, frustrating, scary, calm

**Full assessment fields** (set during in-depth LLM analysis):
- `relevance` — single relevance rating (1-10)
- `summary` — 40-70 word summary
- `quote` — key quote with attribution
- `marketingBlurb` — up to 230 chars, starts with publisher name
- `relevanceReasons` — detailed factor bullet points (newline-separated)
- `antifactors` — limiting factor bullet points (newline-separated)
- `relevanceCalculation` — rating calculation steps (newline-separated)
