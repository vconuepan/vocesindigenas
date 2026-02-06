# Phase 5: Admin Dashboard — Implementation Plan

**Status: COMPLETED**

## Requirements

Build the admin dashboard frontend for the Actually Relevant news curation platform. The backend has 40+ admin API endpoints ready. The frontend currently has only a public layout with homepage and 404 page. We need 8 admin pages across 4 sub-phases.

**Choices**: Headless UI + Tailwind (UI), TanStack Query (data fetching), sub-phase delivery.

**Deferred**: Settings page (OpenAI key, model selection) — stays as env vars for now. Added to backlog.

---

## Sub-phase 5.1: Foundation + Dashboard

**Install**: `@headlessui/react`, `@heroicons/react`, `@tanstack/react-query`, `date-fns`

**New files**:

| File | Purpose |
|------|---------|
| `client/src/lib/admin-api.ts` | Typed fetch wrapper with Bearer auth from `localStorage`, `ApiError` class, methods organized by resource (`adminApi.stories.list()`, etc.) |
| `client/src/lib/auth.tsx` | `AuthProvider` + `useAuth()` — stores API key in localStorage, validates via `GET /stats`, redirects on 401 |
| `client/src/lib/query.ts` | `QueryClient` config (staleTime: 30s, retry: 1) |
| `client/src/lib/constants.ts` | Badge variant maps for statuses/emotions, `JOB_DISPLAY_NAMES`, `formatStatus()` |
| `client/src/hooks/useStoryStats.ts` | `useStoryStats()` query hook |
| `client/src/hooks/useJobs.ts` | `useJobs()` query hook |
| `client/src/components/ui/Button.tsx` | Variants: primary/secondary/danger/ghost, sizes, loading state, focus-visible ring |
| `client/src/components/ui/Badge.tsx` | Pill badge with color variants |
| `client/src/components/ui/Card.tsx` | White card with title, optional action area |
| `client/src/components/ui/LoadingSpinner.tsx` | Animated SVG spinner |
| `client/src/components/ui/EmptyState.tsx` | Empty state with icon, title, description, action |
| `client/src/components/ui/ErrorState.tsx` | Error display with retry button |
| `client/src/components/ui/PageHeader.tsx` | Title + description + actions layout |
| `client/src/components/ui/ConfirmDialog.tsx` | Headless UI Dialog for confirm/cancel actions |
| `client/src/layouts/AdminLayout.tsx` | Sidebar nav (Dashboard, Stories, Feeds, Issues, Newsletters, Podcasts, Jobs), top bar with logout, `bg-neutral-50` content area, mobile hamburger via Headless UI Dialog. Auth guard redirects to login. Wraps content in `QueryClientProvider`. |
| `client/src/pages/admin/LoginPage.tsx` | API key input, validates against server, stores in localStorage |
| `client/src/pages/admin/DashboardPage.tsx` | Story stats grid (7 cards by status), jobs health table (name, last run, status dot, error), quick action buttons (Crawl All, Pre-assess, Assess, Select) |

**Modify**:
- `client/src/App.tsx` — Add `AuthProvider` wrapper, admin routes (`/admin/login`, `/admin` with `AdminLayout`)

**Tests**: `admin-api.test.ts`, `Button.test.tsx`, `Badge.test.tsx`, `ConfirmDialog.test.tsx`, `DashboardPage.test.tsx`

---

## Sub-phase 5.2: Stories Management

**New files**:

| File | Purpose |
|------|---------|
| `client/src/hooks/useStories.ts` | All story query/mutation hooks (list, get, update, status, bulk, preassess, assess, select, publish, reject, delete, crawl-url) |
| `client/src/hooks/useFeeds.ts` | `useFeeds()` query hook (for filter dropdowns) |
| `client/src/hooks/useIssues.ts` | `useIssues()` query hook (for filter dropdowns) |
| `client/src/components/ui/Pagination.tsx` | Previous/Next + page numbers with ellipsis |
| `client/src/components/ui/Select.tsx` | Styled select with label |
| `client/src/components/ui/Input.tsx` | Styled input with label + error |
| `client/src/components/ui/Textarea.tsx` | Styled textarea with label + error |
| `client/src/components/ui/Toast.tsx` | Toast notification system with `useToast()` hook, `ToastProvider` |
| `client/src/components/admin/StoryFiltersBar.tsx` | Status, issue, feed, emotion, rating range, date range, sort dropdowns. Synced to URL via `useSearchParams()`. |
| `client/src/components/admin/StoryTable.tsx` | Columns: checkbox, Title, Status (Badge), Rating, Emotion, Feed, Crawled. Per-row action menu (Headless UI Menu). |
| `client/src/components/admin/BulkActionsBar.tsx` | Sticky bar when stories selected. Buttons: Pre-assess, Assess, Select, Publish, Reject, Trash. Each opens ConfirmDialog. |
| `client/src/components/admin/StoryDetail.tsx` | Slide-over panel (Headless UI Dialog). Shows all fields: metadata, ratings, AI analysis cards (summary, quote, keywords, blurb, reasons, antifactors, calculation, scenarios), expandable content. Edit toggle for AI fields. |
| `client/src/components/admin/StoryEditForm.tsx` | Editable fields: title, status, ratings, emotion, all AI text fields. Uses `useUpdateStory()`. |
| `client/src/components/admin/CrawlUrlForm.tsx` | Dialog with URL input + feed select. Uses `useCrawlUrl()`. |
| `client/src/pages/admin/StoriesPage.tsx` | Combines filters bar, table, pagination, bulk actions, story detail slide-over, crawl URL dialog |
| `client/src/pages/admin/StoryDetailPage.tsx` | Full-page story detail at `/admin/stories/:id` for direct links |

**Modify**:
- `client/src/App.tsx` — Add `stories` and `stories/:id` routes
- `client/src/layouts/AdminLayout.tsx` — Add `ToastProvider`

**Key patterns**:
- Filters persisted in URL search params (bookmarkable)
- Selection state is local (resets on filter/page change)
- Rating inputs debounced 300ms
- Optimistic status updates with rollback

**Tests**: `useStories.test.ts`, `StoryFiltersBar.test.tsx`, `StoryTable.test.tsx`, `BulkActionsBar.test.tsx`, `Pagination.test.tsx`, `StoriesPage.test.tsx`

---

## Sub-phase 5.3: Feeds + Issues Management

**New files**:

| File | Purpose |
|------|---------|
| `client/src/components/admin/FeedTable.tsx` | Columns: Title, URL, Issue, Language, Active toggle, Interval, Last Crawled, Selector indicator, Actions (Edit, Crawl Now, Delete) |
| `client/src/components/admin/FeedForm.tsx` | Create/edit dialog: title, URL, issue select, language, interval, HTML selector, active toggle |
| `client/src/components/admin/IssueTable.tsx` | Columns: Name, Slug, Description, Created, Actions (Edit, Delete) |
| `client/src/components/admin/IssueForm.tsx` | Create/edit: name, slug (auto-generated), description, plus "LLM Prompt Configuration" section with 3 large textareas (factors, antifactors, ratings) |
| `client/src/pages/admin/FeedsPage.tsx` | PageHeader with "Add Feed" + "Crawl All" actions, filter by issue/active, FeedTable |
| `client/src/pages/admin/IssuesPage.tsx` | PageHeader with "Add Issue", IssueTable |
| `client/src/pages/admin/IssueEditPage.tsx` | Full-page issue edit form (prompt textareas need space). Used for `/admin/issues/new` and `/admin/issues/:id/edit` |

**Extend**:
- `client/src/hooks/useFeeds.ts` — Add create/update/delete/crawl/crawlAll mutations
- `client/src/hooks/useIssues.ts` — Add create/update/delete mutations

**Modify**:
- `client/src/App.tsx` — Add `feeds`, `issues`, `issues/new`, `issues/:id/edit` routes

**Key patterns**:
- Auto-slug from name in create mode
- Delete protection shows API error message (can't delete issue with feeds, can't delete feed with stories)
- Active toggle is optimistic with immediate UI update

**Tests**: `FeedForm.test.tsx`, `IssueForm.test.tsx`, `FeedsPage.test.tsx`

---

## Sub-phase 5.4: Newsletters + Podcasts + Jobs

**New files**:

| File | Purpose |
|------|---------|
| `client/src/hooks/useNewsletters.ts` | CRUD + assign + generate + carousel mutations |
| `client/src/hooks/usePodcasts.ts` | CRUD + assign + generate mutations |
| `client/src/components/admin/NewsletterTable.tsx` | Title, Status badge, story count, date, actions |
| `client/src/components/admin/NewsletterDetail.tsx` | Title edit, actions (Assign Stories, Generate Content, Generate Carousel/ZIP, Publish/Unpublish), story list, content preview/edit |
| `client/src/components/admin/PodcastTable.tsx` | Same pattern as newsletter table |
| `client/src/components/admin/PodcastDetail.tsx` | Same pattern but Generate Script, no carousel |
| `client/src/components/admin/CreateContentDialog.tsx` | Reusable: title input + create. Props: `type: 'newsletter' | 'podcast'` |
| `client/src/components/admin/JobsTable.tsx` | Name, cron (inline editable), enabled toggle, last started/completed, error (expandable), status dot (green/red/yellow/gray), Run Now button |
| `client/src/components/admin/CronEditor.tsx` | Cron input + human-readable description + save |
| `client/src/pages/admin/NewslettersPage.tsx` | Status filter tabs (All/Draft/Published), table, "New Newsletter" action |
| `client/src/pages/admin/NewsletterDetailPage.tsx` | Full detail page at `/admin/newsletters/:id` |
| `client/src/pages/admin/PodcastsPage.tsx` | Same pattern |
| `client/src/pages/admin/PodcastDetailPage.tsx` | Same pattern |
| `client/src/pages/admin/JobsPage.tsx` | Jobs table with `refetchInterval: 10_000` for live status updates |

**Extend**:
- `client/src/hooks/useJobs.ts` — Add `useUpdateJob()`, `useRunJob()` mutations

**Modify**:
- `client/src/App.tsx` — Add `newsletters`, `newsletters/:id`, `podcasts`, `podcasts/:id`, `jobs` routes

**Key patterns**:
- Carousel ZIP download via `response.blob()` + `URL.createObjectURL` + auto-click download
- LLM generation buttons show persistent loading overlay ("This may take a minute")
- Jobs page auto-refreshes every 10 seconds

**Tests**: `useNewsletters.test.ts`, `NewsletterDetail.test.tsx`, `JobsTable.test.tsx`, `CronEditor.test.tsx`, `JobsPage.test.tsx`

---

## Final Route Structure

```
/admin/login          → LoginPage (no auth required)
/admin                → AdminLayout (auth required)
  /admin              → DashboardPage
  /admin/stories      → StoriesPage
  /admin/stories/:id  → StoryDetailPage
  /admin/feeds        → FeedsPage
  /admin/issues       → IssuesPage
  /admin/issues/new   → IssueEditPage
  /admin/issues/:id/edit → IssueEditPage
  /admin/newsletters  → NewslettersPage
  /admin/newsletters/:id → NewsletterDetailPage
  /admin/podcasts     → PodcastsPage
  /admin/podcasts/:id → PodcastDetailPage
  /admin/jobs         → JobsPage
```

---

## Risks

| Risk | Mitigation |
|------|------------|
| LLM operations (newsletter/podcast generation) take 10-60s | Persistent loading overlay with "may take a minute" message |
| API key in localStorage vulnerable to XSS | Acceptable for single-user admin v1. Upgrade to httpOnly cookie later. |
| No real-time updates when background jobs complete | Jobs page auto-refreshes every 10s. Other pages use manual refetch. |

---

## Verification

After each sub-phase:
1. `npm run build --prefix client` — must pass
2. `npm run test --prefix client -- --run` — must pass
3. Manual test: start both servers, navigate to `/admin`, verify the new pages work against real API

After all sub-phases:
- Full walkthrough: login → dashboard → create issue → create feed → crawl feed → view stories → filter/sort/paginate → view story detail → edit story → bulk actions → create newsletter → assign stories → generate content → download carousel → create podcast → generate script → view jobs → toggle job → edit cron → run job manually
