# Plan: Client Async Communication — Background Tasks with Progress Toasts

## Problem

Bulk LLM operations (preassess, assess, select) block the admin UI. The ConfirmDialog stays open with a spinner, preventing navigation or any other work. The sequential assess loop is especially painful — assessing 20 stories can take minutes with no progress feedback.

## Solution

Client-side background task system with persistent progress toasts. No server changes.

- **ConfirmDialog closes immediately** after confirm — task runs in the background
- **Progress toasts** stick in the corner across page navigation ("Assessing 3/20...")
- **Completion toasts** auto-dismiss after showing success/error result
- Multiple tasks can run concurrently

## Architecture

```
ToastProvider (extended with progress type)
  └─ BackgroundTaskProvider (new — manages task registry, calls toast APIs)
       └─ AdminLayout content
            └─ StoriesPage (launches tasks via useBackgroundTasks hook)
```

Both providers live in `AdminLayout`, so state survives SPA navigation.

## File Changes

### 1. Extend Toast System — `client/src/components/ui/Toast.tsx`

Add a `'progress'` toast type with these changes:

- **ID type**: `number` → `string` (for stable caller-supplied IDs)
- **New type**: `'progress'` — blue/indigo styling with animated spinner icon
- **New context methods**:
  - `addProgressToast(id: string, message: string)` — creates a non-auto-dismissing toast
  - `updateToast(id: string, updates: { type?: ToastType; message?: string })` — updates an existing toast in-place; starts auto-dismiss timer when type transitions to `'success'` or `'error'`
  - `removeToast(id: string)` — manual removal (already exists, just update param type)
- **Rendering**: progress toasts get `bg-blue-50 text-blue-800 border-blue-200` with `ArrowPathIcon` + `animate-spin`
- **Existing `toast(type, message)`** continues working unchanged — generates auto-IDs internally

### 2. Create Background Task Manager — `client/src/hooks/useBackgroundTasks.tsx` (new file)

```typescript
// Types
interface TaskProgress { current: number; total: number }
type TaskStatus = 'running' | 'success' | 'error'

type TaskExecutor = (
  reportProgress: (current: number, total: number) => void
) => Promise<{ succeeded: number; failed: number }>

interface BackgroundTaskContextValue {
  tasks: BackgroundTask[]
  launchTask: (options: {
    id: string
    label: string
    executor: TaskExecutor
    onComplete?: () => void
  }) => void
  hasRunningTasks: boolean
}
```

**Behavior**:
- `launchTask` registers the task, shows a progress toast, and fires the executor (async, not awaited)
- The `executor` receives a `reportProgress(current, total)` callback for sequential operations
- On resolve → transition toast to success, fire `onComplete` (for query invalidation)
- On reject → transition toast to error, fire `onComplete`
- Clean up task from registry 5s after completion

### 3. Wire Provider — `client/src/layouts/AdminLayout.tsx`

Nest `BackgroundTaskProvider` inside `ToastProvider`:

```tsx
<ToastProvider>
  <BackgroundTaskProvider>
    {/* existing layout JSX */}
  </BackgroundTaskProvider>
</ToastProvider>
```

### 4. Refactor StoriesPage — `client/src/pages/admin/StoriesPage.tsx`

**Changes to `handleBulkAction`**:

- **preassess**: Launch background task, call `adminApi.stories.preassess(ids)` directly in executor. Indeterminate progress (no per-item tracking).
- **assess**: Launch background task with sequential loop. Executor calls `reportProgress(current, total)` after each story → toast shows "Assessing 3/20..."
- **select**: Launch background task, call `adminApi.stories.select(ids)` directly in executor. Indeterminate progress.
- **Status changes** (publish/reject/trash): Keep as-is (blocking) — these are instant DB operations.

All three background actions:
1. Clear selection immediately (`setSelectedIds(new Set())`)
2. Call `launchTask(...)` (fire-and-forget)
3. `onComplete` callback invalidates `['stories']` and `['storyStats']` query keys

**Remove unused hooks**: `usePreassessStories`, `useAssessStory`, `useSelectStories` are no longer needed in StoriesPage (they still exist in `useStories.ts` for other consumers).

**Update `confirmLoading`**: Remove LLM mutation pending checks:
```typescript
// Before: bulkUpdate.isPending || preassess.isPending || assessStory.isPending || selectStories.isPending || deleteStory.isPending
// After:  bulkUpdate.isPending || deleteStory.isPending
```

**Import changes**: Add `useBackgroundTasks`, `useQueryClient`, `adminApi`. Remove unused mutation hook imports.

## Files Summary

| File | Action | What |
|------|--------|------|
| `client/src/components/ui/Toast.tsx` | Modify | Add progress type, string IDs, update methods, spinner rendering |
| `client/src/hooks/useBackgroundTasks.tsx` | Create | Background task context, provider, hook |
| `client/src/layouts/AdminLayout.tsx` | Modify | Add BackgroundTaskProvider wrapping |
| `client/src/pages/admin/StoriesPage.tsx` | Modify | Refactor bulk actions to fire-and-forget |

## Edge Cases

- **Duplicate prevention**: Task IDs include `Date.now()` so the same operation type can be launched multiple times. This is intentional — user may want to assess different batches concurrently.
- **Logout during task**: API calls will 401, executor catch block handles gracefully → error toast.
- **Stale closures**: `setTasks` in executor callbacks uses functional updater pattern, so always works with latest state.
- **Query invalidation**: Single invalidation at task completion (not per-item) to avoid excessive refetching.

## Testing

- **Toast unit tests**: progress toast creation, update, auto-dismiss transition
- **BackgroundTask unit tests**: task launch, progress reporting, error handling, onComplete callback
- **StoriesPage integration**: mock API, verify dialog closes immediately, progress toast appears, transitions to success

## Verification

1. `npm run build --prefix client` — must compile cleanly
2. `npm run test --prefix client -- --run` — all tests pass
3. Manual verification via browser: select stories → click Assess → dialog closes immediately → progress toast shows "Assessing 1/N..." → toast transitions to success on completion → user can navigate during processing
