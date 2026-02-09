# Structured Data (JSON-LD) for SEO

## Goal

Add JSON-LD structured data to key pages for rich search results, Google News eligibility, and better search visibility.

## Current State

- No JSON-LD or structured data exists anywhere in the codebase
- Helmet is used on every page for meta tags (title, description, OG tags)
- `CommonOgTags` component exists in `client/src/lib/seo.tsx`
- Story pages already set `og:type=article`, `article:published_time`, `article:author`
- Sitemap is dynamic and includes all published stories

## Implementation

### 1. Story pages — `NewsArticle` schema

This is the highest-value addition. Renders in `StoryPage.tsx` inside `<Helmet>`.

```json
{
  "@context": "https://schema.org",
  "@type": "NewsArticle",
  "headline": "Story title",
  "description": "Story summary (max 200 chars)",
  "datePublished": "2026-01-15T12:00:00Z",
  "author": {
    "@type": "Organization",
    "name": "Actually Relevant",
    "url": "https://actuallyrelevant.news"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Actually Relevant",
    "url": "https://actuallyrelevant.news",
    "logo": {
      "@type": "ImageObject",
      "url": "https://actuallyrelevant.news/images/logo.png"
    }
  },
  "mainEntityOfPage": "https://actuallyrelevant.news/stories/story-slug",
  "image": "https://actuallyrelevant.news/images/og-image.png",
  "articleSection": "Issue name"
}
```

### 2. Homepage — `WebSite` + `Organization` schema

```json
[
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Actually Relevant",
    "url": "https://actuallyrelevant.news",
    "description": "AI-curated news that matters to humanity",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://actuallyrelevant.news/search?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Actually Relevant",
    "url": "https://actuallyrelevant.news",
    "logo": "https://actuallyrelevant.news/images/logo.png",
    "sameAs": []
  }
]
```

The `SearchAction` enables the Google sitelinks searchbox.

### 3. Issue pages — `CollectionPage` schema

```json
{
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": "Human Development - Actually Relevant",
  "description": "Issue description",
  "url": "https://actuallyrelevant.news/issues/human-development",
  "isPartOf": {
    "@type": "WebSite",
    "name": "Actually Relevant"
  }
}
```

### 4. Breadcrumb schema (Story + Issue pages)

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://actuallyrelevant.news" },
    { "@type": "ListItem", "position": 2, "name": "Human Development", "item": "https://actuallyrelevant.news/issues/human-development" },
    { "@type": "ListItem", "position": 3, "name": "Story Title" }
  ]
}
```

### 5. Helper utility

**File:** `client/src/lib/structured-data.ts`

```tsx
export function buildArticleSchema(story: PublicStory): object { ... }
export function buildWebSiteSchema(): object { ... }
export function buildOrganizationSchema(): object { ... }
export function buildBreadcrumbSchema(items: { name: string; url?: string }[]): object { ... }
export function buildCollectionPageSchema(issue: PublicIssue): object { ... }
```

Each function returns a plain object. Render in pages with:

```tsx
<Helmet>
  <script type="application/ld+json">
    {JSON.stringify(buildArticleSchema(story))}
  </script>
</Helmet>
```

## Files to Create/Modify

| File | Action |
|------|--------|
| `client/src/lib/structured-data.ts` | Create — schema builder functions |
| `client/src/pages/StoryPage.tsx` | Add NewsArticle + BreadcrumbList JSON-LD |
| `client/src/pages/HomePage.tsx` | Add WebSite + Organization JSON-LD |
| `client/src/pages/IssuePage.tsx` | Add CollectionPage + BreadcrumbList JSON-LD |

## Validation

After implementation, validate with:
- [Google Rich Results Test](https://search.google.com/test/rich-results)
- [Schema.org Validator](https://validator.schema.org/)

## Estimated Scope

Small-medium — 1 new utility file + modifications to 3 page components. ~150 lines of code.
