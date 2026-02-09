# Public API Documentation

## Goal

Document the public API with an OpenAPI spec and a developer-facing docs page. Make it easy for third parties to consume AR data. Add CLAUDE.md instructions so the spec stays in sync with the codebase.

## Current State

- 12 public API endpoints across 6 route groups (homepage, stories, issues, feed, subscribe, sitemap)
- Request validation via Zod schemas (`server/src/schemas/`)
- No OpenAPI spec, no Swagger UI, no developer docs
- Public API key system exists (`PUBLIC_API_KEY` env var) but isn't documented

## Implementation

### 1. Generate OpenAPI spec from Zod schemas

Use `zod-openapi` (lightweight, no runtime overhead) to annotate existing Zod schemas and generate an OpenAPI 3.1 spec.

**File:** `server/src/lib/openapi.ts`

Approach:
- Extend existing Zod schemas with `.openapi()` metadata (title, description, examples)
- Define routes with request/response schemas
- Export a `getOpenAPIDocument()` function that builds the full spec

```typescript
import { createDocument } from 'zod-openapi'

export function getOpenAPIDocument() {
  return createDocument({
    openapi: '3.1.0',
    info: {
      title: 'Actually Relevant API',
      version: '1.0.0',
      description: 'AI-curated news API. Access published stories, issues, and RSS feeds.',
    },
    servers: [
      { url: 'https://api.actuallyrelevant.news', description: 'Production' },
    ],
    paths: { /* route definitions */ },
  })
}
```

### 2. Serve the spec

**Endpoint:** `GET /api/docs/openapi.json`

Returns the generated spec as JSON. No UI dependency needed server-side.

### 3. Developer docs page on the client

**Route:** `/developers` (public, lazy-loaded)

**File:** `client/src/pages/DevelopersPage.tsx`

Options for rendering the spec:

| Option | Pros | Cons |
|--------|------|------|
| **Stoplight Elements** (`@stoplight/elements`) | Beautiful, interactive, try-it-out | 200KB+ bundle, heavy |
| **Scalar** (`@scalar/api-reference`) | Modern, lightweight (~50KB), good DX | Newer, less ecosystem |
| **Static markdown page** | Zero dependency, matches site design | No interactive features, manual maintenance |
| **Link to external** (e.g., hosted Swagger) | No client bundle impact | Off-site experience |

**Recommendation:** Scalar — modern, lightweight, and can be lazy-loaded so it doesn't affect the main bundle.

```tsx
import { ApiReference } from '@scalar/api-reference-react'

export default function DevelopersPage() {
  return (
    <ApiReference
      configuration={{
        spec: { url: `${API_BASE}/docs/openapi.json` },
        theme: 'default',
      }}
    />
  )
}
```

### 4. Document all public endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/homepage` | GET | Homepage data with emotion-bucketed stories |
| `/api/stories` | GET | List published stories (paginated, filterable) |
| `/api/stories/:slug` | GET | Single story by slug |
| `/api/issues` | GET | All issues with hierarchy |
| `/api/issues/:slug` | GET | Single issue by slug |
| `/api/feed` | GET | RSS feed (all stories) |
| `/api/feed/:issueSlug` | GET | RSS feed (per issue) |
| `/api/subscribe` | POST | Newsletter subscription |
| `/api/subscribe/confirm` | GET | Confirm subscription |
| `/api/sitemap.xml` | GET | Dynamic sitemap |

Each endpoint gets: summary, description, parameters, request body (if applicable), response schema with examples, error responses.

### 5. Authentication documentation

Document the two auth modes:
- **No auth:** Most public endpoints work without authentication
- **API key:** `Authorization: Bearer <PUBLIC_API_KEY>` for higher rate limits (if desired in the future)

### 6. Rate limit documentation

Document current limits:
- 100 requests per 15 minutes per IP (public)
- 3 requests per minute for subscribe endpoint

### 7. CLAUDE.md instructions for keeping docs in sync

Add to CLAUDE.md:

```markdown
## API Documentation

- **OpenAPI spec** is generated from Zod schemas in `server/src/lib/openapi.ts`
- When adding or modifying public API endpoints:
  1. Update the Zod schema in `server/src/schemas/`
  2. Update the route definition in `server/src/lib/openapi.ts`
  3. Add `.openapi()` metadata to new Zod fields (description, example)
- The spec is served at `GET /api/docs/openapi.json` and rendered at `/developers`
- Run `npm run test --prefix server` to verify the spec generates without errors
```

## Files to Create/Modify

| File | Action |
|------|--------|
| `server/src/lib/openapi.ts` | Create — OpenAPI spec generation |
| `server/src/routes/public/docs.ts` | Create — serve spec endpoint |
| `server/src/app.ts` | Mount docs route |
| `server/src/schemas/*.ts` | Annotate with `.openapi()` metadata |
| `client/src/pages/DevelopersPage.tsx` | Create — API docs page |
| `client/src/App.tsx` | Add `/developers` route |
| `client/src/routes.ts` | Add to prerender routes |
| `CLAUDE.md` | Add API documentation maintenance instructions |
| `package.json` (server) | Add `zod-openapi` dependency |
| `package.json` (client) | Add `@scalar/api-reference-react` dependency |

## Decisions

- **Docs renderer:** Scalar (`@scalar/api-reference-react`) — modern, ~50KB, interactive
- **Location:** Public site at `/developers`
- **Admin endpoints:** Not documented publicly (public API only)
- **Rate limit tiers:** TBD — start with same limits for all, revisit when there's demand

## Estimated Scope

Medium — new dep, spec generation file, 1 new route, 1 new page, schema annotations. ~250 lines of new code + schema annotations.
