# Batch 3 Plan Follow-up — Decisions Recorded

## Plans Created

11 plans were created, 10 were implemented (story deduplication was deferred to backlog).

1. **Social Sharing Buttons** — Share buttons on story pages (implemented)
2. **Structured Data JSON-LD** — JSON-LD structured data for SEO (implemented)
3. **Story Deduplication** — Detect/link duplicate stories across feeds (deferred)
4. **Personalization** — Public personalization via localStorage (implemented)
5. **API Documentation** — OpenAPI spec + Scalar developer docs page (implemented)
6. **Embeddable Widgets** — Embeddable story widgets for third-party sites (implemented)
7. **Accessibility Fixes** — WCAG 2.2 AA gap fixes (implemented)
8. **Source Quality Scoring** — Feed quality metrics in admin (implemented)
9. **Related Stories Link** — "Related Stories" section on story pages (implemented)
10. **Issue Page Server Pagination** — Fix client-side pagination on issue pages (implemented)
11. **pgvector Typed Wrapper** — Typed wrapper for pgvector raw SQL (implemented)

## Key Decisions

### Story Deduplication (deferred)
- Approach: B+D — post-analysis linking + selection-time diversity
- Data model: Cluster table (`story_clusters`) instead of simple `duplicateOfId` FK
- Validation: LLM confirmation (small model) to avoid false positives
- Deferred to backlog — not implemented in this batch

### Personalization
- Phase 1: Reading history, saved stories, topic preferences, "more like this"
- Homepage: Preferred issues reorder to top
- Saved stories: Full page at `/saved`
- Accounts: Deferred to Phase 2

### API Documentation
- Renderer: Scalar (`@scalar/api-reference-react`)
- Location: `/developers` on public site (outside PublicLayout for full-page Scalar)
- Scope: Public API only (no admin endpoints)

### Source Quality Scoring
- Time window: All-time metrics
- Visibility: Admin-only
- Minimum: 10 stories before showing quality score

### Issue Page Pagination
- Approach: Tag-based filtering (map slider positions to emotion tag sets)
- Page size: 12
- Positivity in URL: No (stays in localStorage)

## Implementation Order Used

1. Social sharing buttons
2. Structured data / JSON-LD
3. Accessibility fixes
4. pgvector typed wrapper
5. Related stories link
6. Issue page server pagination
7. Source quality scoring
8. Personalization Phase 1
9. API documentation
10. Embeddable widgets
