# Fix: Server-Side Pagination for Issue Pages

## Problem

Issue pages fetch up to 100 stories from the API, then filter and paginate entirely client-side. This means:
- Stories beyond 100 are invisible (hard cap)
- All 100 stories are transferred even if the user only views page 1
- Page number is lost on refresh (not URL-persisted)
- As published story count grows, this becomes increasingly wasteful

## Current State

**Client (`client/src/pages/IssuePage.tsx`):**
- Fetches with `pageSize: 100` (hardcoded)
- Filters by positivity slider using `filterStoriesByPositivity()` client-side
- Slices into pages of 12 client-side
- Page state in `useState` (not URL-persisted)

**Server (`server/src/services/story.ts` → `getPublishedStories()`):**
- Supports `page`, `pageSize`, `issueSlug` params
- Returns `{ data, total, page, pageSize, totalPages }`
- No emotion/positivity filtering on server

**Positivity filter (`client/src/lib/mix-stories.ts` → `filterStoriesByPositivity()`):**
- 5 positions: 0%, 25%, 50%, 75%, 100%
- At 50%: show all stories
- At 0% or 100%: show only negative or only uplifting
- At 25% or 75%: proportional ratio mixing (needs full dataset knowledge)

## Challenge: Positivity Filtering

The core difficulty is that the positivity slider uses **ratio-based mixing** at 25% and 75%. For example, at 75%, it shows all positive stories + enough negative stories to achieve a 75/25 ratio. This requires knowing the full dataset.

### Approaches to Resolve

**Approach A: Simplify to tag-based filtering (recommended)**

Map positivity positions to emotion tag filters on the server:

| Positivity | Server filter |
|------------|--------------|
| 0% | `emotionTag IN ('frustrating', 'scary')` |
| 25% | `emotionTag IN ('frustrating', 'scary', 'calm')` |
| 50% | No filter (all stories) |
| 75% | `emotionTag IN ('uplifting', 'calm')` |
| 100% | `emotionTag = 'uplifting'` |

**Trade-off:** This is a slightly different behavior from the current ratio-based mixing. At 25%, instead of getting a proportional mix, you get all negative + calm stories. At 75%, you get all positive stories (uplifting + calm). The practical difference is small — the current ratio logic already approximates tag-based filtering at these positions.

**Approach B: Bucket-based fetching (like homepage)**

Fetch separate emotion buckets from the server, then mix client-side with a page offset.

**Endpoint changes:** `GET /api/stories?issueSlug=X&emotionBuckets=true` returns `{ uplifting: [...], calm: [...], negative: [...] }`

**Trade-off:** More complex API, heavier response, but preserves exact ratio mixing.

**Approach C: Server-side ratio calculation**

Add a `positivity` parameter to the API. The server calculates the ratio and returns the correct page of mixed results.

**Trade-off:** Complex server logic, harder to cache, couples the API to the slider implementation.

### Recommendation

**Approach A** — simplify to tag-based filtering. The behavioral difference is negligible, and it enables clean server-side pagination with standard parameters.

## Implementation

### 1. Add `emotionTags` filter to the stories API

**File:** `server/src/schemas/story.ts`

```typescript
export const publicStoryQuerySchema = z.object({
  issueSlug: z.string().optional(),
  search: z.string().max(200).optional(),
  emotionTags: z.string().optional(), // comma-separated: "uplifting,calm"
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(12),
})
```

**File:** `server/src/services/story.ts` (in `getPublishedStories()`)

```typescript
if (options.emotionTags?.length) {
  conditions.push({ emotionTag: { in: options.emotionTags } })
}
```

### 2. Map positivity to emotion tags on the client

**File:** `client/src/lib/mix-stories.ts`

```typescript
export function positivityToEmotionTags(positivity: number): string[] | undefined {
  switch (positivity) {
    case 0:   return ['frustrating', 'scary']
    case 25:  return ['frustrating', 'scary', 'calm']
    case 50:  return undefined // all stories
    case 75:  return ['uplifting', 'calm']
    case 100: return ['uplifting']
    default:  return undefined
  }
}
```

### 3. Update IssuePage to use server-side pagination

**File:** `client/src/pages/IssuePage.tsx`

```tsx
export default function IssuePage() {
  const { slug } = useParams<{ slug: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const { positivity } = usePositivity()

  const emotionTags = positivityToEmotionTags(positivity)

  const { data: storiesData, isLoading: storiesLoading } = usePublicStories({
    issueSlug: slug,
    emotionTags: emotionTags?.join(','),
    page,
    pageSize: 12,
  })

  // Reset to page 1 when positivity changes
  useEffect(() => {
    if (page !== 1) {
      setSearchParams((prev) => { prev.delete('page'); return prev })
    }
  }, [positivity])

  const onPageChange = (newPage: number) => {
    setSearchParams((prev) => {
      if (newPage === 1) prev.delete('page')
      else prev.set('page', String(newPage))
      return prev
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      {/* ... */}
      <Pagination
        page={storiesData?.page ?? 1}
        totalPages={storiesData?.totalPages ?? 1}
        onPageChange={onPageChange}
      />
    </>
  )
}
```

### 4. Update the hook

**File:** `client/src/hooks/usePublicStories.ts`

Add `emotionTags` to the query parameters and query key.

### 5. Remove client-side filtering

The `filterStoriesByPositivity()` function is still used by the homepage (which fetches emotion buckets separately). It stays, but IssuePage no longer calls it.

## Files to Modify

| File | Action |
|------|--------|
| `server/src/schemas/story.ts` | Add `emotionTags` to public query schema |
| `server/src/services/story.ts` | Add emotion tag filter to `getPublishedStories()` |
| `client/src/pages/IssuePage.tsx` | Switch to server-side pagination |
| `client/src/hooks/usePublicStories.ts` | Add `emotionTags` param |
| `client/src/lib/api.ts` | Add `emotionTags` to API call params |
| `client/src/lib/mix-stories.ts` | Add `positivityToEmotionTags()` utility |

## Decisions

- **Positivity filtering:** Tag-based filtering (Approach A) — map slider positions to emotion tag sets
- **Page size:** Keep 12 (current value) — feels right for the layout
- **URL param for positivity:** No — keep as localStorage personal preference. Shared links show the recipient's own mood setting.

## Estimated Scope

Small — server schema + filter addition, client page refactor. ~100 lines of changes.
