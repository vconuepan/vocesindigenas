# Batch Plan Follow-Up — Decisions Recorded

## Plans Created

1. `.plans/social-sharing-buttons.md` — Share buttons on story pages
2. `.plans/structured-data-jsonld.md` — JSON-LD structured data for SEO
3. `.plans/story-deduplication.md` — Detect/link duplicate stories across feeds
4. `.plans/personalization.md` — Public personalization (localStorage → accounts)
5. `.plans/api-documentation.md` — OpenAPI spec + developer docs page
6. `.plans/embeddable-widgets.md` — Embeddable story widgets for third-party sites
7. `.plans/accessibility-fixes.md` — WCAG 2.2 AA gap fixes
8. `.plans/source-quality-scoring.md` — Feed quality metrics in admin
9. `.plans/related-stories-link.md` — "Related Stories" section on story pages
10. `.plans/issue-page-server-pagination.md` — Fix client-side pagination on issue pages
11. `.plans/pgvector-typed-wrapper.md` — Typed wrapper for pgvector raw SQL

---

## All Decisions

### 3. Story Deduplication
- **Approach:** B+D — post-analysis linking + selection-time diversity
- **Data model:** Cluster table (`story_clusters`) instead of simple `duplicateOfId` FK
- **Validation:** LLM confirmation (small model) to avoid false positives from embedding similarity alone
- **Remaining:** Embedding timing (pre-assessment vs post-publish), threshold tuning, auto-reject behavior — to resolve during implementation

### 4. Personalization
- **Phase 1 scope:** All four features (reading history, saved stories, topic preferences, "more like this")
- **Homepage:** Preferred issues reorder to top
- **Saved stories:** Full page at `/saved`
- **Accounts:** Deferred to Phase 2

### 5. API Documentation
- **Renderer:** Scalar (`@scalar/api-reference-react`)
- **Location:** `/developers` on public site
- **Scope:** Public API only (no admin endpoints)

### 6. Embeddable Widgets
- **Priority:** Build after API documentation is complete

### 8. Source Quality Scoring
- **Time window:** All-time metrics
- **Visibility:** Admin-only
- **Minimum:** 10 stories before showing quality score

### 10. Issue Page Pagination
- **Approach:** Tag-based filtering (map slider positions to emotion tag sets)
- **Page size:** 12
- **Positivity in URL:** No (stays in localStorage)

### Plans with no open questions
- 1 (Social Sharing) — ready to implement
- 2 (Structured Data) — ready to implement
- 7 (Accessibility) — ready to implement
- 9 (Related Stories) — ready to implement
- 11 (pgvector Wrapper) — ready to implement

---

## Suggested Implementation Order

Based on dependencies and impact:

**Tier 1 — Quick wins, no dependencies:**
1. Social sharing buttons (small)
2. Structured data / JSON-LD (small)
3. Accessibility fixes (small)
4. pgvector typed wrapper (small, pure refactor)

**Tier 2 — Medium effort, high value:**
5. Related stories link (small, uses existing embeddings)
6. Issue page server pagination (small, fixes a real limitation)
7. Source quality scoring (small-medium, admin-only)

**Tier 3 — Larger features:**
8. Personalization Phase 1 (medium, 4 features)
9. Story deduplication (medium-large, new LLM integration)
10. API documentation (medium, foundation for widgets)

**Tier 4 — Depends on Tier 3:**
11. Embeddable widgets (medium-large, depends on #10)
