# Responsive Admin Tables & Unified Action Icons

Make all 4 admin tables responsive with breakpoint-based column visibility, add unified action icons, and add per-row story job triggers.

## Breakpoint Strategy

| Breakpoint | Behavior |
|------------|----------|
| `< md` (< 768px) | Mobile: hide detail columns, overflow menu (⋮) for actions, two-row layout for stories |
| `≥ md` (768px) | Tablet: show key columns, inline icon buttons for actions |
| `≥ lg` (1024px) | Desktop: show all columns |

## Icon Mapping

All from `@heroicons/react/24/outline`:

| Action | Icon | Used in |
|--------|------|---------|
| Edit | `PencilSquareIcon` | All tables |
| Delete | `TrashIcon` | All tables |
| Overflow menu | `EllipsisVerticalIcon` | All tables (mobile) |
| Crawl | `ArrowPathIcon` | FeedTable |
| Pre-assess | `AdjustmentsHorizontalIcon` | StoryTable (status=fetched) |
| Assess | `SparklesIcon` | StoryTable (status=pre_analyzed) |
| Select | `CheckCircleIcon` | StoryTable (status=analyzed) |
| Publish | `GlobeAltIcon` | StoryTable (status=analyzed, selected) |
| Reject | `XCircleIcon` | StoryTable (any non-rejected) |
| Trash | `ArchiveBoxXMarkIcon` | StoryTable (any non-trashed) |

## New Files

| File | Purpose |
|------|---------|
| `client/src/components/ui/ActionIconButton.tsx` | Reusable icon button with tooltip, focus ring, and variants |

## Modified Files

| File | Change |
|------|--------|
| `client/src/components/admin/StoryTable.tsx` | Two-row mobile, responsive columns, status-dependent job icons, overflow menu on mobile |
| `client/src/components/admin/FeedTable.tsx` | Responsive columns, icon actions on desktop, overflow menu on mobile |
| `client/src/components/admin/IssueTable.tsx` | Responsive columns, icon actions on desktop, overflow menu on mobile |
| `client/src/components/admin/UserTable.tsx` | Responsive columns, icon actions on desktop, overflow menu on mobile |
| `client/src/pages/admin/StoriesPage.tsx` | Add per-row job handlers (preassess, assess, select, publish) |

## Implementation Steps

### Step 1: ActionIconButton component

```tsx
// client/src/components/ui/ActionIconButton.tsx
interface ActionIconButtonProps {
  icon: React.ForwardRefExoticComponent<...>
  label: string
  onClick: () => void
  variant?: 'default' | 'danger'
  disabled?: boolean
  className?: string
}
```

- Renders `<button>` with 24x24 icon, `title` + `aria-label` from `label` prop
- Default: `text-neutral-400 hover:text-neutral-600`
- Danger: `text-neutral-400 hover:text-red-600`
- Focus: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500`
- Disabled: `opacity-30 cursor-not-allowed`

### Step 2: StoryTable responsive + action icons

**New props added to StoryTable:**
- `onPreassess: (id: string) => void`
- `onAssess: (id: string) => void`
- `onSelect: (id: string) => void`
- `onPublish: (id: string) => void`

**Column visibility:**

| Column | < md | ≥ md | ≥ lg |
|--------|------|------|------|
| Checkbox | ✓ | ✓ | ✓ |
| Title | ✓ | ✓ | ✓ |
| Status | hidden | ✓ | ✓ |
| Rating | hidden | ✓ | ✓ |
| Emotion | hidden | hidden | ✓ |
| Crawled | hidden | hidden | ✓ |
| Actions | ✓ | ✓ | ✓ |

**Two-row mobile layout:**
On `< md`, each story renders two `<tr>` elements:
1. **Metadata row** (`class="md:hidden"`): Single `<td colspan>` with inline flex of status badge + rating + emotion badge + date
2. **Main row**: Checkbox + title + actions (with hidden detail `<td>`s that appear at `md:`)

**Desktop actions (≥ md, `hidden md:flex`):**
Status-dependent job icons + PencilSquareIcon (edit) + TrashIcon (delete)

| Story status | Job icons shown |
|-------------|----------------|
| fetched | AdjustmentsHorizontalIcon (pre-assess) |
| pre_analyzed | SparklesIcon (assess) |
| analyzed | CheckCircleIcon (select) + GlobeAltIcon (publish) |
| selected | GlobeAltIcon (publish) |
| published/rejected/trashed | none |

**Mobile actions (< md, `md:hidden`):**
EllipsisVerticalIcon overflow menu with text labels: job actions (status-dependent) + Edit + Publish/Reject/Trash + Delete

### Step 3: StoriesPage — single-story job handlers

Add four handler functions to `StoriesPage`:

- **`handlePreassess(id)`**: `launchTask` → `adminApi.stories.preassess([id])` → invalidate
- **`handleAssess(id)`**: `launchTask` → `adminApi.stories.assess(id)` → invalidate
- **`handleSelect(id)`**: `launchTask` → `adminApi.stories.select([id])` → invalidate
- **`handlePublish(id)`**: `launchTask` → `adminApi.stories.publish(id)` → invalidate

Pass all four as props to `<StoryTable>`.

### Step 4: FeedTable responsive + action icons

**Column visibility:**

| Column | < md | ≥ md | ≥ lg |
|--------|------|------|------|
| Title | ✓ | ✓ | ✓ |
| URL | hidden | hidden | ✓ |
| Issue | hidden | ✓ | ✓ |
| Lang | hidden | hidden | ✓ |
| Active | hidden | ✓ | ✓ |
| Interval | hidden | hidden | ✓ |
| Last Crawled | hidden | hidden | ✓ |
| Selector | hidden | hidden | ✓ |
| Actions | ✓ | ✓ | ✓ |

**Desktop actions (≥ md):** PencilSquareIcon + ArrowPathIcon + TrashIcon (danger)
**Mobile actions (< md):** Overflow menu: Edit, Crawl, Delete

### Step 5: IssueTable responsive + action icons

**Column visibility:**

| Column | < md | ≥ md | ≥ lg |
|--------|------|------|------|
| Name | ✓ | ✓ | ✓ |
| Slug | hidden | ✓ | ✓ |
| Description | hidden | hidden | ✓ |
| Published | hidden | ✓ | ✓ |
| Actions | ✓ | ✓ | ✓ |

**Desktop actions (≥ md):** PencilSquareIcon + TrashIcon (danger)
**Mobile actions (< md):** Overflow menu: Edit, Delete

**IssueTable prop change:** `onEdit: (issue: Issue) => void` → `onEdit: (id: string) => void` to match other tables. Update IssuesPage accordingly.

### Step 6: UserTable responsive + action icons

**Column visibility:**

| Column | < md | ≥ md | ≥ lg |
|--------|------|------|------|
| Name | ✓ | ✓ | ✓ |
| Email | hidden | ✓ | ✓ |
| Role | hidden | ✓ | ✓ |
| Created | hidden | hidden | ✓ |
| Actions | ✓ | ✓ | ✓ |

**Desktop actions (≥ md):** PencilSquareIcon + TrashIcon (danger, disabled for self)
**Mobile actions (< md):** Overflow menu: Edit, Delete (disabled for self)

## Verification

1. `npm run build --prefix client` — zero errors
2. `npm run test --prefix client -- --run` — all tests pass
3. Manual check at 3 viewport widths (< 768px, 768–1023px, ≥ 1024px):
   - Columns appear/disappear correctly per table
   - StoryTable shows two-row mobile layout with metadata badges
   - Action icons visible on desktop, overflow menu on mobile
   - Story job icons match current story status
   - All action callbacks work (edit, delete, crawl, job triggers)
