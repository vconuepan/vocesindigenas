# Plan: Story Slug-Based Routing ✅ COMPLETED

## Goal

Replace UUID-based story URLs (`/stories/:id`) with human-readable slug-based URLs (`/stories/:slug`) for better SEO and readability.

## Design Decisions

- **Slug format**: Title-only, lowercase, hyphens. E.g. `ai-breakthrough-in-protein-folding`
- **Generation timing**: At publish time, from `story.title` (fallback to `sourceTitle` if null)
- **Uniqueness**: Global `@unique` constraint. Duplicates resolved by appending `-2`, `-3`, etc.
- **Max length**: Truncate to ~80 chars (at word boundary) before uniqueness suffix
- **No backward compat**: Site hasn't launched — UUID routes simply replaced
- **Admin can edit slugs**: Editable field on story detail page with format validation
- **No third-party library**: Hand-rolled `slugify()` — the logic is trivial
- **Existing data**: Can be re-seeded; no data migration needed for published stories

## Implementation Phases

### Phase 1: Database & Utility

**Files:**
- `server/prisma/schema.prisma` — Add `slug String? @unique` to Story model
- `server/src/utils/slugify.ts` (new) — `slugify(text, maxLength?)` utility
- `server/src/services/story.ts` — Add `generateUniqueSlug(title)` that checks DB for conflicts and appends suffix

**Slug generation logic:**
```
slugify("AI Breakthrough in Protein Folding!") → "ai-breakthrough-in-protein-folding"
```
- Lowercase, replace non-alphanumeric with hyphens, collapse multiple hyphens, trim hyphens from ends
- Truncate at word boundary to ~80 chars
- Query DB: if slug exists, try `slug-2`, `slug-3`, etc.

### Phase 2: Publish Job Integration

**Files:**
- `server/src/jobs/publishStories.ts` — When publishing a story, generate and set its slug
- `server/src/services/story.ts` — Ensure publish flow sets slug

### Phase 3: Public API & Routing

**Files:**
- `server/src/routes/public/stories.ts` — Change `GET /:id` to `GET /:slug`, lookup by slug
- `server/src/services/story.ts` — Add/change `getPublishedStoryBySlug(slug)`
- `shared/types/index.ts` — Add `slug: string | null` to `Story`, `slug: string` to `PublicStory`

### Phase 4: Client Routing & Links

**Files:**
- `client/src/App.tsx` — Change route from `/stories/:id` to `/stories/:slug`
- `client/src/pages/StoryPage.tsx` — Use `slug` param, call updated API
- `client/src/components/StoryCard.tsx` — Link to `/stories/${story.slug}`
- `client/src/lib/api.ts` — Change `stories.get(id)` to `stories.get(slug)` (param rename)
- `client/src/hooks/` — Update `usePublicStory` to accept slug

### Phase 5: Admin Slug Editing

**Files:**
- `client/src/components/admin/StoryEditForm.tsx` — Add slug field (editable, with format hint)
- `client/src/components/admin/StoryDetail.tsx` — Display slug
- `server/src/routes/admin/stories.ts` — Accept slug in update payload
- Admin pages continue using story ID internally for navigation

### Phase 6: Sitemap

**Files:**
- `client/scripts/generate-sitemap.ts` — Query published stories, add `/stories/:slug` entries

## Verification

1. Run `npm run db:migrate --prefix server -- --name add_story_slug`
2. Run `npm run build --prefix server` — no type errors
3. Run `npm run test --prefix server -- --run` — all tests pass
4. Run `npm run build --prefix client` — no type errors
5. Manually verify:
   - Publish a story → slug is generated
   - Visit `/stories/<slug>` → story loads
   - Edit slug in admin → URL updates
   - Duplicate titles get `-2` suffix
