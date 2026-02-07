# Batch Implementation Follow-up

## Summary

All 10 plans implemented successfully. No plans needed to be skipped.

### Plans Implemented

1. **Accessibility Fixes** — Native `<dialog>` for mobile menu, `aria-controls`, axe-core dev overlay, a11y test
2. **API Documentation** — OpenAPI spec via `zod-openapi`, Scalar interactive docs at `/developers`
3. **Embeddable Widgets** — Shadow DOM widget.js, iframe embed page, widget generator
4. **Issue Page Server Pagination** — Server-side emotion tag filtering, URL-persisted pagination
5. **Personalization** — Reading history, bookmarks, saved stories page
6. **pgvector Typed Wrapper** — Centralized `vectors.ts` for all raw SQL embedding operations
7. **Related Stories** — `GET /api/stories/:slug/related` endpoint + RelatedStories component on story page
8. **Social Sharing Buttons** — X, LinkedIn, email, copy link + native Web Share API
9. **Source Quality Scoring** — Feed quality metrics (publish rate, avg relevance) in admin
10. **Structured Data JSON-LD** — NewsArticle, WebSite, Organization, CollectionPage, BreadcrumbList schemas

## User Input Needed

### Related Stories — Redesign needed

Current implementation does real-time cosine distance query on every story page view (cached 5 min). A better architecture:

- **At publish time**: compute 3 nearest already-published stories, store IDs on the story record
- **When viewing**: also fetch stories published *after* this one that reference it as related (reverse lookup), take 3 most recent
- **Result**: mix of "older context" + "newer developments"

This needs a DB migration (new field on stories table) and integration into the publish pipeline. Current implementation works as a placeholder but should be redesigned.

## DB Migrations

None applied. Related stories redesign (above) will require one.

## Files to Be Deleted

None.

## Implementation Issues

None. All builds pass, all tests pass (540 server + 147 client).

## Notes

- The Scalar API reference component (`DevelopersPage`) produces a large chunk (~3MB). This is already lazy-loaded so it doesn't affect initial page load, but the chunk size warning appears during build.
- `zod-openapi@4` was used instead of v5 because v5 requires Zod v4 and this project uses Zod v3.25.
- The feed quality metrics endpoint uses an in-memory cache with configurable TTL (default 10 min) to avoid expensive aggregation queries on every request.
