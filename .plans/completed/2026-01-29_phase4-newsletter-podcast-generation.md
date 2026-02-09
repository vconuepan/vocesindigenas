# Phase 4: Newsletter & Podcast Generation

**Status:** Completed
**Created:** 2026-01-29
**Parent plan:** `.plans/001-full-migration-plan.md` (Phase 4)

---

## 1. Requirements Restatement

Build the newsletter and podcast generation services that transform published stories into distributable content:

- **Newsletter generation** — Collect published stories, generate formatted content (template-based, not LLM), generate carousel images (PNG cards per story + PDF bundle), and package as downloadable ZIP
- **Podcast generation** — Collect published stories, generate a podcast script via LLM prompt, append story list with links
- **CRUD operations** — Create, read, update, delete for both newsletters and podcasts
- **Manual workflow** — Admin creates a newsletter/podcast, assigns stories, triggers generation. No automated scheduling in v1.

Both the Prisma schema and shared TypeScript types already exist. This phase adds services, routes, prompts, schemas, and tests.

---

## 2. Architecture Decisions

### Newsletter content: Template-based (not LLM)

The PHP original uses PHP view templates (`newsletter_post`, `newsletter_tweet`) to format story data — it does NOT use the LLM for newsletter content generation. We'll replicate this with TypeScript template functions. The migration plan mentions LLM generation as an option, but the actual PHP implementation is template-based, and that's what we'll build first. LLM-enhanced newsletter content can be added later.

### Carousel images: `sharp` + `@napi-rs/canvas`

- `@napi-rs/canvas` for text rendering on images (replaces PHP GD `imagettftext`)
- `sharp` for image format conversion and optimization
- Category-specific header images (1200x80 PNG) — we'll create placeholder versions initially
- Logo image (112x80 PNG) — placeholder initially
- Font files: We'll bundle open-source fonts (Inter Bold for titles, Inter Regular for body text) as a substitute for the proprietary Nexa Bold + Roboto from the PHP version

### PDF generation: `pdfkit`

Lightweight, no browser dependency. Each carousel image becomes a landscape page (1200x675 points).

### ZIP bundling: `archiver`

Node.js streaming ZIP creation.

### Podcast script: LLM-generated

Port the PHP prompt directly. Use `getSmallLLM()` with structured output — the podcast prompt produces a single text script.

---

## 3. Implementation Steps

### Step 1: Add dependencies

```
npm install --prefix server @napi-rs/canvas pdfkit archiver
npm install --prefix server -D @types/pdfkit @types/archiver
```

Note: `sharp` is already likely available. If not, add it too.

### Step 2: Zod schemas for LLM output (`server/src/schemas/llm.ts`)

Add schemas for podcast script generation:

```typescript
export const podcastScriptSchema = z.object({
  script: z.string().describe('Full podcast script text'),
})
```

Newsletter doesn't need an LLM schema — it uses templates.

### Step 3: Prompt templates (`server/src/services/prompts.ts`)

Add `buildPodcastPrompt(stories)`:

- Port the PHP podcast prompt from `chatgpt.php:470-508`
- Input: Array of story objects with category, title, summary, publisher, relevance reasons, antifactors
- Format each story as `<STORY>` XML block (matching PHP format)
- Append the podcast generation instructions verbatim from PHP

### Step 4: Newsletter service (`server/src/services/newsletter.ts`)

**CRUD functions:**
- `getNewsletters(filters)` — List with pagination, optional status filter
- `getNewsletterById(id)` — Single with included story data
- `createNewsletter(data)` — Create with title
- `updateNewsletter(id, data)` — Update title, content, status, storyIds
- `deleteNewsletter(id)` — Hard delete

**Story assignment:**
- `assignStories(newsletterId)` — Auto-assign recent published stories (stories with status `published` or `selected`) that aren't already assigned to another newsletter

**Content generation:**
- `generateContent(newsletterId)` — Template-based formatting:
  - Fetch stories by `storyIds`, include feed + issue for category
  - Sort stories by issue/category name
  - For each story, render a text block with: title, publisher, summary, relevance summary, marketing blurb, source URL
  - Also generate a "tweet" version (short social media text per story)
  - Store generated content in the `content` field

**Carousel image generation:**
- `generateCarouselImages(newsletterId)` — Returns a ZIP file path:
  1. Fetch stories with category, title, summary, publisher, date
  2. For each story, create a 1200x675 PNG using `@napi-rs/canvas`:
     - White background
     - Category-specific header image (1200x80) at top
     - Logo (112x80) at bottom-right
     - Category text (15pt, regular)
     - Title text (30pt, bold, word-wrapped)
     - Publisher + date (20pt, regular)
     - Summary text (20pt, regular, word-wrapped)
  3. Generate PDF with all images using `pdfkit` (landscape pages)
  4. Bundle images + PDF into ZIP using `archiver`
  5. Return ZIP file path for download

### Step 5: Podcast service (`server/src/services/podcast.ts`)

**CRUD functions:**
- `getPodcasts(filters)` — List with pagination, optional status filter
- `getPodcastById(id)` — Single with included story data
- `createPodcast(data)` — Create with title
- `updatePodcast(id, data)` — Update title, script, status, storyIds
- `deletePodcast(id)` — Hard delete

**Story assignment:**
- `assignStories(podcastId)` — Same logic as newsletter: auto-assign recent published/selected stories

**Script generation:**
- `generateScript(podcastId)` — LLM-based:
  1. Fetch stories by `storyIds`, include feed + issue for category
  2. Build `<STORY>` XML blocks with: category, title, summary, publisher, relevance reasons, antifactors
  3. Call `buildPodcastPrompt(storyBlocks)`
  4. Invoke LLM with structured output (`podcastScriptSchema`)
  5. Append story list with links (matching PHP format)
  6. Store generated script in the `script` field

### Step 6: Request validation schemas (`server/src/schemas/newsletter.ts`, `server/src/schemas/podcast.ts`)

**Newsletter schemas:**
- `createNewsletterSchema` — `{ title: string }`
- `updateNewsletterSchema` — `{ title?, content?, status?, storyIds? }`
- `newsletterQuerySchema` — `{ status?, page?, pageSize? }`

**Podcast schemas:**
- `createPodcastSchema` — `{ title: string }`
- `updatePodcastSchema` — `{ title?, script?, status?, storyIds? }`
- `podcastQuerySchema` — `{ status?, page?, pageSize? }`

### Step 7: Admin routes (`server/src/routes/admin/newsletters.ts`)

```
GET    /api/admin/newsletters              — List newsletters (paginated, filterable)
POST   /api/admin/newsletters              — Create newsletter
GET    /api/admin/newsletters/:id          — Get single newsletter
PUT    /api/admin/newsletters/:id          — Update newsletter
DELETE /api/admin/newsletters/:id          — Delete newsletter
POST   /api/admin/newsletters/:id/assign   — Auto-assign stories
POST   /api/admin/newsletters/:id/generate — Generate newsletter content
POST   /api/admin/newsletters/:id/carousel — Generate carousel images (returns ZIP download)
```

### Step 8: Admin routes (`server/src/routes/admin/podcasts.ts`)

```
GET    /api/admin/podcasts              — List podcasts (paginated, filterable)
POST   /api/admin/podcasts              — Create podcast
GET    /api/admin/podcasts/:id          — Get single podcast
PUT    /api/admin/podcasts/:id          — Update podcast
DELETE /api/admin/podcasts/:id          — Delete podcast
POST   /api/admin/podcasts/:id/assign   — Auto-assign stories
POST   /api/admin/podcasts/:id/generate — Generate podcast script
```

### Step 9: Register routes (`server/src/routes/admin/index.ts`)

Add newsletter and podcast routers to the admin route tree.

### Step 10: Tests

**Service tests (mocked Prisma):**
- Newsletter CRUD operations
- Podcast CRUD operations
- Story assignment logic
- Content generation (template output format)

**Route tests (supertest):**
- All newsletter endpoints (CRUD + assign + generate + carousel)
- All podcast endpoints (CRUD + assign + generate)
- Auth required on all endpoints
- Error handling (404 for missing resources, 400 for invalid input)

**LLM tests (mocked LLM):**
- Podcast prompt building
- Podcast script generation with mocked LLM response

### Step 11: Asset files for carousel images

Create placeholder assets:
- `server/assets/images/header_human_development_1200x80.png`
- `server/assets/images/header_planet_climate_1200x80.png`
- `server/assets/images/header_science_tech_1200x80.png`
- `server/assets/images/header_general_news_1200x80.png`
- `server/assets/images/header_existential_risks_1200x80.png`
- `server/assets/images/logo_112x80.png`
- `server/assets/fonts/Inter-Bold.ttf`
- `server/assets/fonts/Inter-Regular.ttf`

Note: The actual branded images will be provided later. Placeholders allow development and testing.

---

## 4. New Files Summary

```
server/src/services/newsletter.ts      # Newsletter CRUD + generation + carousel
server/src/services/podcast.ts         # Podcast CRUD + generation
server/src/routes/admin/newsletters.ts # Newsletter admin API
server/src/routes/admin/podcasts.ts    # Podcast admin API
server/src/schemas/newsletter.ts       # Newsletter request validation
server/src/schemas/podcast.ts          # Podcast request validation
server/assets/images/*.png             # Header + logo placeholders
server/assets/fonts/*.ttf              # Font files for image generation
```

**Modified files:**
```
server/src/schemas/llm.ts              # Add podcastScriptSchema
server/src/services/prompts.ts         # Add buildPodcastPrompt
server/src/routes/admin/index.ts       # Register newsletter + podcast routers
shared/types/index.ts                  # No changes needed (types already exist)
```

---

## 5. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| `@napi-rs/canvas` platform compatibility | Medium | Falls back to text-only newsletter if canvas unavailable. Canvas has good Windows/Linux/macOS support. |
| Font rendering differences vs PHP GD | Low | Accept visual differences from PHP version. Inter font is a quality substitute. |
| Newsletter templates not in migration files | Low | The PHP `newsletter_post` and `newsletter_tweet` templates weren't included in `.to-migrate/`. We'll create reasonable templates based on the data fields used in the controller. |
| Large ZIP files for many stories | Low | Carousel images are ~100KB each. Even 20 stories = ~2MB ZIP. Acceptable. |

---

## 6. Out of Scope

- Email delivery of newsletters (generation only)
- Audio generation for podcasts (script only)
- Automated scheduling of newsletter/podcast generation
- Public-facing newsletter/podcast pages (Phase 6)
- LLM-enhanced newsletter blurb generation (the PHP code has this commented out; defer to backlog)
