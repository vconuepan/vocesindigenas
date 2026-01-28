# .to-migrate Reference Files

PHP reference files from the original RelevanceSpider WordPress plugin, kept for migration to Node.js/TypeScript. These files are **read-only reference** — do not modify them.

---

## When Each File Is Needed

### Phase 2: Content Extraction Pipeline

| File | What to reference |
|---|---|
| `models/feed.php` | Feed data model, RSS crawling, content extraction with 3-tier fallback (CSS selector → Goose → PipFeed API), crawl interval logic |
| `controllers/feed_controller.php` | Feed crawling orchestration, story creation from RSS items, deduplication, activation/deactivation |

### Phase 3: LLM Relevance Analysis

| File | What to reference |
|---|---|
| `models/chatgpt.php` | **MOST CRITICAL FILE.** ~700 lines of prompt engineering: pre-assessment prompts, full assessment prompts (XML-structured), post selection logic, podcast generation prompts, token rate limiting, response parsing |
| `models/story.php` | Story data model, status lifecycle (unrated → pre-rated → rated → post), filtering/sorting queries, relevance field structure |
| `models/issue.php` | Issue-specific prompt section generation (factors, antifactors, rating scale definitions) |
| `controllers/story_controller.php` | Full story workflow: crawl → preassess → assess → create post → select for publication. Batch processing, AI response parsing, metadata extraction |
| `controllers/api_controller.php` | REST API endpoint patterns for external access |

### Phase 4: Newsletter & Podcast Generation

| File | What to reference |
|---|---|
| `controllers/newsletter_controller.php` | Newsletter generation workflow, carousel image generation (GD library), PDF creation (TCPDF), post selection for newsletter, ZIP bundling |
| `controllers/podcast_controller.php` | Podcast script generation, story data formatting for LLM input |

### Phase 5: Admin Dashboard

| File | What to reference |
|---|---|
| `views/stories.php` | Stories list UI: filter controls (issue, status, date range, rating range, emotion tag), sort options, pagination, bulk actions |
| `views/story.php` | Story detail/edit form: relevance ratings, AI analysis display, metadata fields, status controls |
| `views/feeds.php` | Feed management UI: add/edit forms, crawl status, interval config |
| `views/newsletters.php` | Newsletter list and generation UI |
| `views/podcasts.php` | Podcast list and generation UI |
| `custom_fields.php` | Complete list of metadata fields tracked per story (ratings, reasons, antifactors, calculation, scenarios, summary, quote, blurb, keywords) |
| `relevance-spider.php` | Plugin entry point — shows all registered hooks, shortcodes, and integration points |

---

## File Inventory

```
.to-migrate/
├── models/
│   ├── chatgpt.php          # 39K — LLM prompts, assessment logic, response parsing
│   ├── story.php            # 11K — Story CRUD, filtering, sorting, status lifecycle
│   ├── feed.php             # 10K — Feed management, RSS parsing, content extraction
│   └── issue.php            #  1K — Issue config, prompt section builder
│
├── controllers/
│   ├── story_controller.php     # 13K — Story lifecycle orchestration, batch processing
│   ├── feed_controller.php      # 10K — Crawl orchestration, deduplication
│   ├── newsletter_controller.php # 14K — Newsletter + image + PDF generation
│   ├── podcast_controller.php   #  5K — Podcast script generation
│   └── api_controller.php       #  — REST API endpoint definitions
│
├── views/                   # Admin UI templates (reference for React dashboard)
│   ├── stories.php          # Story list with filters, sorts, bulk actions
│   ├── story.php            # Story detail/edit form
│   ├── feeds.php            # Feed management interface
│   ├── newsletters.php      # Newsletter list/edit
│   └── podcasts.php         # Podcast list/edit
│
├── custom_fields.php        # 7K — All tracked metadata field definitions
├── relevance-spider.php     # 4K — Plugin entry point, hooks, shortcodes
│
└── REFERENCE.md             # This file
```
