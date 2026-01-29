# Newsletter & Podcast Generation

## Overview

Newsletters and podcasts are content formats generated from published/selected stories. Both follow a create-assign-generate workflow via admin API endpoints. Newsletters use template-based formatting; podcasts use LLM-generated scripts.

## Workflow

1. **Create** — `POST /api/admin/newsletters` or `/api/admin/podcasts` with a title
2. **Assign stories** — `POST /:id/assign` auto-assigns recent published/selected stories (last 7 days)
3. **Generate content** — `POST /:id/generate` produces the content
4. **Edit** — `PUT /:id` to manually edit generated content
5. **Publish** — `PUT /:id` with `status: 'published'`

## Newsletter

### Content generation (`POST /api/admin/newsletters/:id/generate`)

Template-based (no LLM). For each assigned story, outputs:
- Title as heading
- Category and publisher
- Marketing blurb
- AI summary
- Relevance reasons
- Link to original article

Stories are sorted by issue/category name for grouping.

### Carousel images (`POST /api/admin/newsletters/:id/carousel`)

Generates a downloadable ZIP containing:
- One 1200x675 PNG per story (category header, title, publisher, date, summary)
- A PDF with all images as landscape pages

Uses `@napi-rs/canvas` for image generation, `pdfkit` for PDF, `archiver` for ZIP.

Category-specific header colors/images are mapped by keyword matching on the category name (human, planet, science, general, existential).

### Asset files

Located in `server/assets/`:
- `images/` — Header images (1200x80) and logo (112x80). Placeholders used until branded versions are provided.
- `fonts/` — Inter Bold and Inter Regular TTF files for image text rendering.

## Podcast

### Script generation (`POST /api/admin/podcasts/:id/generate`)

LLM-generated using `getSmallLLM()` with `podcastScriptSchema` (Zod structured output).

The prompt (`buildPodcastPrompt` in `prompts.ts`) formats each story as an XML `<STORY>` block with:
- Category, title, summary, publisher
- Relevance reasons and limiting factors as bullet points

The prompt instructs the LLM to write a podcast script with:
- Intro (welcome to Actually Relevant Podcast)
- Sections by category (existential risk subcategories grouped)
- Outro (feedback request, thanks)

After the LLM script, a story list with links is appended.

## API Endpoints

### Newsletters
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/newsletters` | List (paginated, filterable by status) |
| POST | `/api/admin/newsletters` | Create |
| GET | `/api/admin/newsletters/:id` | Get single |
| PUT | `/api/admin/newsletters/:id` | Update |
| DELETE | `/api/admin/newsletters/:id` | Delete |
| POST | `/api/admin/newsletters/:id/assign` | Auto-assign recent stories |
| POST | `/api/admin/newsletters/:id/generate` | Generate text content |
| POST | `/api/admin/newsletters/:id/carousel` | Generate carousel ZIP (download) |

### Podcasts
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/podcasts` | List (paginated, filterable by status) |
| POST | `/api/admin/podcasts` | Create |
| GET | `/api/admin/podcasts/:id` | Get single |
| PUT | `/api/admin/podcasts/:id` | Update |
| DELETE | `/api/admin/podcasts/:id` | Delete |
| POST | `/api/admin/podcasts/:id/assign` | Auto-assign recent stories |
| POST | `/api/admin/podcasts/:id/generate` | Generate podcast script |

## Files

| File | Purpose |
|------|---------|
| `server/src/services/newsletter.ts` | Newsletter CRUD, story assignment, content generation, carousel orchestration |
| `server/src/services/podcast.ts` | Podcast CRUD, story assignment, LLM script generation |
| `server/src/services/carousel.ts` | Canvas image generation, PDF creation, ZIP bundling |
| `server/src/routes/admin/newsletters.ts` | Newsletter admin API endpoints |
| `server/src/routes/admin/podcasts.ts` | Podcast admin API endpoints |
| `server/src/schemas/newsletter.ts` | Newsletter request validation schemas |
| `server/src/schemas/podcast.ts` | Podcast request validation schemas |
| `server/src/schemas/llm.ts` | `podcastScriptSchema` for LLM structured output |
| `server/src/services/prompts.ts` | `buildPodcastPrompt` for podcast script generation |

## Modifying

- **To change newsletter format:** Edit the template loop in `newsletter.ts:generateContent()`
- **To change podcast prompt:** Edit `buildPodcastPrompt()` in `prompts.ts`
- **To change podcast output structure:** Update `podcastScriptSchema` in `schemas/llm.ts` AND the prompt
- **To add new carousel image layouts:** Edit `createStoryImage()` in `carousel.ts`
- **To use real branded assets:** Replace placeholder files in `server/assets/images/` and `server/assets/fonts/`
