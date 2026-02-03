# Skeleton Placeholders

Skeleton components prevent Cumulative Layout Shift (CLS) by rendering placeholder UI with the same dimensions as the final content before data loads.

## Why Skeletons Matter

Without skeletons, content that loads from the backend causes layout shifts:
1. Page renders empty space
2. Data arrives from API
3. Content appears, pushing other elements down
4. Lighthouse flags this as CLS (poor user experience)

With skeletons:
1. Page renders skeleton with correct dimensions
2. Data arrives from API
3. Skeleton is replaced with real content (no shift)
4. Zero CLS

## Available Skeleton Components

All skeletons are in `client/src/components/skeletons/`:

| Component | Use For |
|-----------|---------|
| `StoryCardSkeleton` | All StoryCard variants (featured, compact, horizontal, equal) |
| `HeroSkeleton` | HomePage hero section |
| `IssueSectionSkeleton` | HomePage issue sections (layouts A, B, C) |
| `IssuePageSkeleton` | IssuePage header and initial stories |
| `StoryPageSkeleton` | Full story article page |
| `IssueAccordionSkeleton` | IssuesPage accordion items |
| `SearchResultsSkeleton` | SearchPage results grid |

## Usage Pattern

Every component that fetches data dynamically must show a skeleton while loading:

```tsx
import { SomeSkeleton } from '../components/skeletons'

function MyComponent() {
  const { data, isLoading } = useMyData()

  // Show skeleton while loading
  if (isLoading) {
    return <SomeSkeleton />
  }

  // Render real content
  return <RealContent data={data} />
}
```

## Creating New Skeletons

When adding a new component that loads data:

1. **Create a skeleton** in `client/src/components/skeletons/`
2. **Match dimensions exactly** — measure the real component's height/width
3. **Use the same layout structure** — same grid/flex containers
4. **Export from index.ts** — add to the barrel export
5. **Use in the component** — show skeleton when `isLoading` is true

### Skeleton Anatomy

```tsx
export default function MySkeleton() {
  return (
    <div className="animate-pulse">
      {/* Use neutral-200/300 for primary shapes */}
      <div className="h-6 bg-neutral-200 rounded w-3/4 mb-2" />

      {/* Use neutral-100 for secondary shapes */}
      <div className="h-4 bg-neutral-100 rounded w-full" />
    </div>
  )
}
```

Key classes:
- `animate-pulse` — gentle fade animation
- `bg-neutral-200` or `bg-neutral-300` — primary placeholder color
- `bg-neutral-100` — secondary placeholder color
- `rounded` — match real component's border-radius
- Explicit height (`h-*`) and width (`w-*` or fractional `w-3/4`)

## Design Principles

1. **Same outer dimensions** — skeleton must occupy exactly the same space
2. **Similar visual weight** — roughly match where text/images will appear
3. **Subtle animation** — `animate-pulse` is preferred over spinners
4. **No content hints** — don't try to preview actual data

## Pages Using Skeletons

All public pages with dynamic data:

- **HomePage** — HeroSkeleton, IssueSectionSkeleton
- **IssuePage** — IssuePageSkeleton
- **IssuesPage** — IssueAccordionSkeleton
- **StoryPage** — StoryPageSkeleton
- **SearchPage** — SearchResultsSkeleton

## Related Files

- `client/src/components/skeletons/` — all skeleton components
- `client/src/hooks/usePublic*.ts` — data fetching hooks with `isLoading` state
- `client/.plans/admin-vendor-bundle-splitting.md` — related performance investigation
