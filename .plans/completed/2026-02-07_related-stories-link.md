# "Show Me Related Stories" Link on Story Pages

## Goal

Add a "Related Stories" link on each story page that takes the user to a semantic search for stories similar to the one they're reading.

## Current State

- Every published story has a `text-embedding-3-small` embedding (1536 dims)
- Hybrid search (RRF) exists at `GET /api/stories?search=<query>` — but it takes text, not a story ID
- The `/search` page renders search results
- Story pages have navigation links at the bottom: "Back to all stories" and "More in [Issue]"

## Design Options

### Option A: Link to Search (Simplest)

Add a "Find related stories" link that navigates to `/search?q=<story title>`.

**Pros:** Zero backend changes. Leverages existing search infrastructure.
**Cons:** Text search for a title isn't true semantic similarity. Results may be poor if the title is short or generic.

### Option B: Backend Similarity Endpoint (Best Results)

Add a new API endpoint that finds similar stories by embedding similarity.

**Endpoint:** `GET /api/stories/:slug/related?limit=5`

Returns top N similar published stories using cosine distance on embeddings.

**Pros:** True semantic similarity. Most accurate results.
**Cons:** New endpoint, raw SQL query.

### Option C: Client-Side Section (Richest UX)

Instead of a link, render a "Related Stories" section directly on the story page with 3-4 similar story cards.

**Pros:** Best UX — user sees related content without navigating away.
**Cons:** Extra API call on every story page load. More complex.

### Recommended: Option B + display as section on story page

Add the backend endpoint AND render a small "Related Stories" section at the bottom of the story page. This is the most useful and doesn't require the user to navigate away.

## Implementation

### 1. Backend endpoint

**File:** `server/src/routes/public/stories.ts`

```typescript
// GET /api/stories/:slug/related
router.get('/:slug/related', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 4, 10)
  const stories = await storyService.getRelatedStories(req.params.slug, limit)
  res.set('Cache-Control', 'public, max-age=300')
  res.json(stories)
})
```

### 2. Service function

**File:** `server/src/services/story.ts`

```typescript
export async function getRelatedStories(slug: string, limit = 4) {
  // 1. Get the story's embedding
  const [source] = await prisma.$queryRaw<{ id: string; embedding: string }[]>`
    SELECT id, embedding::text FROM stories
    WHERE slug = ${slug} AND status = 'published' AND embedding IS NOT NULL
    LIMIT 1
  `
  if (!source) return []

  // 2. Find similar stories by cosine distance
  const related = await prisma.$queryRaw<{ id: string }[]>`
    SELECT s.id
    FROM stories s
    WHERE s.id != ${source.id}
      AND s.status = 'published'
      AND s.embedding IS NOT NULL
    ORDER BY s.embedding <=> (SELECT embedding FROM stories WHERE id = ${source.id})
    LIMIT ${limit}
  `

  // 3. Fetch full story data
  const stories = await prisma.story.findMany({
    where: { id: { in: related.map(r => r.id) } },
    select: PUBLIC_STORY_SELECT,
  })

  // 4. Preserve similarity order
  const storyMap = new Map(stories.map(s => [s.id, s]))
  return related.map(r => storyMap.get(r.id)).filter(Boolean)
}
```

### 3. Client hook

**File:** `client/src/hooks/usePublicStories.ts`

```typescript
export function useRelatedStories(slug: string | undefined) {
  return useQuery({
    queryKey: ['related-stories', slug],
    queryFn: () => publicApi.getRelatedStories(slug!),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
```

### 4. Story page section

**File:** `client/src/pages/StoryPage.tsx`

Add a "Related Stories" section after the analysis sections, before the bottom navigation:

```tsx
<RelatedStories slug={story.slug} currentIssue={issue} />
```

**Component:** `client/src/components/RelatedStories.tsx`

```tsx
export default function RelatedStories({ slug, currentIssue }) {
  const { data: stories, isLoading } = useRelatedStories(slug)

  if (isLoading) return <RelatedStoriesSkeleton />
  if (!stories?.length) return null

  return (
    <section className="mt-10 pt-8 border-t border-neutral-200">
      <h2 className="section-heading mb-4">Related Stories</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {stories.map(story => (
          <StoryCard key={story.id} story={story} variant="compact" />
        ))}
      </div>
    </section>
  )
}
```

### 5. Caching

- **HTTP cache:** 5 minutes (`max-age=300`) — related stories don't change frequently
- **TanStack Query:** 5-minute stale time
- **Server-side:** Optional in-memory cache per slug (if load becomes an issue)

## Files to Create/Modify

| File | Action |
|------|--------|
| `server/src/routes/public/stories.ts` | Add `/:slug/related` endpoint |
| `server/src/services/story.ts` | Add `getRelatedStories()` function |
| `client/src/hooks/usePublicStories.ts` | Add `useRelatedStories()` hook |
| `client/src/lib/api.ts` | Add `getRelatedStories()` API call |
| `client/src/components/RelatedStories.tsx` | Create — related stories section |
| `client/src/components/skeletons/RelatedStoriesSkeleton.tsx` | Create — loading skeleton |
| `client/src/pages/StoryPage.tsx` | Add RelatedStories section |

## Estimated Scope

Small — 1 new endpoint, 1 new component, 1 hook, integration into story page. ~150 lines of code.
