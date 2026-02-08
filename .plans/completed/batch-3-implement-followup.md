# Batch 3 Implementation Follow-up

## Summary

All 10 plans from batch 3 implemented successfully. No plans skipped.

### Plans Implemented

1. **Accessibility Fixes** — Native `<dialog>` for mobile menu, `aria-controls`, axe-core dev overlay, a11y test
2. **API Documentation** — OpenAPI spec via `zod-openapi`, Scalar interactive docs at `/developers`
3. **Embeddable Widgets** — Shadow DOM widget.js, iframe embed page, widget generator at `/widgets`
4. **Issue Page Server Pagination** — Server-side emotion tag filtering, URL-persisted pagination
5. **Personalization** — Reading history, bookmarks, saved stories page at `/saved`
6. **pgvector Typed Wrapper** — Centralized `vectors.ts` for all raw SQL embedding operations
7. **Related Stories** — `GET /api/stories/:slug/related` endpoint + RelatedStories component on story page
8. **Social Sharing Buttons** — X, LinkedIn, email, copy link + native Web Share API
9. **Source Quality Scoring** — Feed quality metrics (publish rate, avg relevance) in admin
10. **Structured Data JSON-LD** — NewsArticle, WebSite, Organization, CollectionPage, BreadcrumbList schemas

## Post-Implementation Refinements

After the batch was implemented, several rounds of UI refinements were made:

- **Developers page**: Scalar CSS scoped via `?inline` import + useEffect lifecycle to prevent global style leakage. Configured with laserwave theme, modern layout, defaultOpenAllTags. Added "Not a stable API" disclaimer. API version set to 0.1.0.
- **Widget consolidation**: Deleted separate static WidgetsPage, kept only the interactive configurator. Removed intro text. Added relevance summary option (`?summary=true`), uplifting-only filter (`?mood=uplifting`), title labels always shown, AR logo in footer linking to site, dark mode background fix.
- **Related stories**: Enhanced with LLM re-ranking (see `related-stories-llm-reranking.md`).
- **Bookmark icons**: SVG viewBox adjusted to `"0 2 24 22"` + asymmetric padding for vertical centering against title labels.
- **Share buttons**: Wrapped in flex-nowrap container with `|` separator between bookmark and share group.
- **Footer**: Added API link with `</>` icon to Connect column.
- **OpenAPI spec**: Added `emotionTags` query parameter documentation to stories endpoint.

## DB Migrations

None required. All features used existing schema.

## Notes

- The Scalar API reference component produces a large chunk (~3MB). Already lazy-loaded so it doesn't affect initial page load.
- `zod-openapi@4` was used (not v5) because v5 requires Zod v4 and this project uses Zod v3.25.
- Feed quality metrics use in-memory cache with configurable TTL (default 10 min).
- All builds pass, all tests pass (540 server + 147 client).
