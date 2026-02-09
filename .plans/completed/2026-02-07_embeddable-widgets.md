# Embeddable Widgets

## Goal

Allow other websites to embed Actually Relevant content — a "Today's most relevant stories" widget that drives traffic and awareness.

## Current State

- Public API exists and returns published stories with all necessary data
- No embed infrastructure, no widget scripts, no iframe endpoints
- CORS is configured for the frontend URL only

## Design Options

### Option A: JavaScript Embed (`<script>` tag)

The classic embed pattern. Site owners add a `<script>` tag that renders a widget.

```html
<script src="https://actuallyrelevant.news/widget.js" data-issue="human-development" data-count="3"></script>
```

The script:
1. Creates a shadow DOM container (for style isolation)
2. Fetches stories from the public API
3. Renders a compact story list with AR branding

**Pros:** Maximum control over rendering. Responsive. Can match host site's theme.
**Cons:** JavaScript required. Some sites block external scripts. More complex to build.

### Option B: iframe Embed

Provide a dedicated `/embed` page that renders a self-contained widget.

```html
<iframe src="https://actuallyrelevant.news/embed?issue=human-development&count=3" width="100%" height="400" frameborder="0"></iframe>
```

**Pros:** Complete style isolation. Simpler to build (it's just a React page). No script injection concerns.
**Cons:** Fixed height is awkward (can use `postMessage` for auto-resize). Less flexible styling. iframe feels dated.

### Option C: oEmbed / JSON Embed

Provide a JSON endpoint that returns HTML for embedding. Works with platforms that support oEmbed (WordPress, Medium, etc.).

```
GET /api/oembed?url=https://actuallyrelevant.news/stories/story-slug&format=json
```

**Pros:** Native integration with CMS platforms. Standards-based.
**Cons:** Limited to platforms that support oEmbed. Less control over rendering.

### Recommended: Option A (script) + Option B (iframe) as fallback

The script embed is the primary offering. The iframe embed is a simpler fallback for sites that can't use external scripts.

## Implementation

### 1. Widget script

**File:** `client/public/widget.js` (or built from `client/src/widget/`)

A standalone, self-contained JS file (~10KB gzipped) that:
- Reads configuration from `data-*` attributes on the script tag
- Fetches stories from `https://api.actuallyrelevant.news/api/stories`
- Renders into a shadow DOM container next to the script tag
- Includes embedded CSS (no external stylesheet)

**Configuration options:**
| Attribute | Default | Description |
|-----------|---------|-------------|
| `data-count` | `3` | Number of stories (1-5) |
| `data-issue` | (all) | Filter by issue slug |
| `data-theme` | `light` | `light` or `dark` |
| `data-title` | `"Actually Relevant"` | Widget header text |

**Widget layout (compact):**
```
┌────────────────────────────┐
│ ◆ Actually Relevant        │
├────────────────────────────┤
│ • Story title 1            │
│   Source · 2h ago           │
│ • Story title 2            │
│   Source · 5h ago           │
│ • Story title 3            │
│   Source · 1d ago           │
├────────────────────────────┤
│ Powered by actuallyrelevant│
└────────────────────────────┘
```

### 2. Embed page (iframe fallback)

**Route:** `/embed`
**File:** `client/src/pages/EmbedPage.tsx`

A minimal page with no header/footer/nav — just the story list. Reads params from URL query string. Posts height via `window.parent.postMessage` for auto-resize.

### 3. CORS for widget API calls

The widget script runs on third-party domains, so API calls need CORS to allow any origin (or a wildcard) **for public endpoints only**.

**Change:** In `server/src/app.ts`, add a separate CORS config for `/api/stories` and `/api/issues` that allows `*` origin (read-only endpoints, public data).

Alternatively, the widget could proxy through the embed page's origin — but direct API access is simpler.

### 4. Widget generator page

**Route:** `/embed-widget` (or section on `/developers`)
**File:** `client/src/pages/WidgetGeneratorPage.tsx`

An interactive configurator:
- Select issue, count, theme
- Preview the widget live
- Copy the embed code (`<script>` or `<iframe>`)

### 5. Caching

Widget API calls should be cached aggressively:
- Stories endpoint already has `Cache-Control: public, max-age=60`
- Widget script itself: `Cache-Control: public, max-age=3600` (1 hour)
- Consider a CDN for the widget script

## Files to Create/Modify

| File | Action |
|------|--------|
| `client/src/widget/widget.ts` | Create — standalone embed script |
| `client/src/widget/widget.css` | Create — embedded styles |
| `client/vite.config.ts` | Add separate build entry for widget |
| `client/src/pages/EmbedPage.tsx` | Create — iframe embed page |
| `client/src/pages/WidgetGeneratorPage.tsx` | Create — embed code generator |
| `client/src/App.tsx` | Add `/embed` and `/embed-widget` routes |
| `server/src/app.ts` | Widen CORS for public read endpoints |

## Decisions

- **Priority:** Build after API documentation is done (depends on documented, stable public API)
- **Build approach:** TBD at implementation time (separate Vite config likely)
- **CORS strategy:** TBD at implementation time
- **Analytics:** TBD
- **Rate limiting:** TBD

## Estimated Scope

Medium-large — standalone widget script build, iframe page, generator page, CORS changes. ~500 lines of code.
