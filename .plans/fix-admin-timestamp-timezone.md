# Fix Admin Timestamp Timezone + Add Relative Times

## Problem

1. Admin timestamps display in browser local time, not UTC (server time)
2. No relative time context ("2h ago") for timestamps
3. `formatRelativeTime` is duplicated in BlueskyPage and EmbedPage
4. Server clock is in JobsPage header instead of the sidebar

## Changes

### 1. `client/src/lib/constants.ts`
- Add `timeZone: 'UTC'` to `formatDateWithTime`, `formatDate`, `formatShortDate`
- Extract `formatRelativeTime()` as shared utility (consolidate duplicates)

### 2. New: `client/src/components/admin/TimeWithRelative.tsx`
- Small component: absolute time on top, relative time below in smaller/lighter font
- Used by all admin tables for timestamp cells

### 3. Update admin tables to use `<TimeWithRelative>`
- `JobsTable.tsx` — last started, last completed
- `FeedTable.tsx` — last crawled
- `ClusterTable.tsx` — created
- `NewsletterTable.tsx` — created
- `DashboardPage.tsx` — last run

### 4. Move `ServerClock` to `AdminLayout.tsx` sidebar
- Place before "View Website" link
- Add border dividers top and bottom
- Remove from `JobsPage.tsx`

### 5. Deduplicate
- `BlueskyPage.tsx` — import `formatRelativeTime` from constants
- `EmbedPage.tsx` — import `formatRelativeTime` from constants

## Status: Implementing
