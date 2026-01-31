# Server-Side Task Queue

## Overview

Bulk LLM operations (pre-assess, assess, select) run as background tasks on the server with concurrency control via `Semaphore`. The client submits a single request and polls for progress.

## Architecture

```
Client                          Server
  |                               |
  |-- POST /bulk-assess --------->|  Creates TaskState, returns 202 {taskId}
  |                               |  Kicks off background processing
  |-- GET /tasks/:taskId -------->|  Returns {completed, failed, total, status}
  |   (poll every 2s)             |
  |-- GET /tasks/:taskId -------->|  status: "completed"
  |   (stop polling)              |
```

## Server Components

### Task Registry (`server/src/lib/taskRegistry.ts`)

In-memory `Map<string, TaskState>` singleton. Tasks are ephemeral — created on bulk request, auto-cleaned 10 minutes after completion.

- `create(type, total, storyIds)` — Returns `taskId` (UUID)
- `get(taskId)` — Returns serialized `TaskStateResponse` or `undefined`
- `increment(taskId, 'completed' | 'failed', error?)` — Updates counters
- `complete(taskId)` — Marks task as completed/failed based on counters
- `getProcessingStoryIds()` — Returns all story IDs from running tasks (used for UI indicators)
- `clear()` — Testing utility to reset state
- `destroy()` — Stops cleanup timer and clears all tasks

Error messages are capped at 20 per task.

### Bulk Analysis Functions (`server/src/services/analysis.ts`)

Three fire-and-forget wrappers that accept a `taskId` and update progress:

- `bulkPreAssess(storyIds, taskId)` — Reuses existing `preAssessStories()` batching, updates progress after completion
- `bulkAssess(storyIds, taskId)` — Runs each story through `assessStory()` gated by `Semaphore(config.concurrency.assess)`
- `bulkSelect(storyIds, taskId)` — Single LLM call via `selectStories()`, progress is 0 -> done

### API Endpoints (`server/src/routes/admin/stories.ts`)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/stories/bulk-preassess` | Submit bulk preassess. Returns `202 { taskId }`. |
| `POST` | `/stories/bulk-assess` | Submit bulk assess. Returns `202 { taskId }`. |
| `POST` | `/stories/bulk-select` | Submit bulk select. Returns `202 { taskId }`. |
| `GET` | `/stories/tasks/:taskId` | Poll task progress. Returns `TaskStateResponse`. |
| `GET` | `/stories/processing` | Get all story IDs currently being processed. |

All bulk endpoints validate `{ storyIds: string[] }` via `bulkStoryIdsSchema` (1-500 UUIDs).

## Client Components

### Admin API (`client/src/lib/admin-api.ts`)

Methods: `bulkPreassess`, `bulkAssess`, `bulkSelect`, `taskStatus`, `processing`.

### Background Task Context (`client/src/hooks/useBackgroundTasks.tsx`)

- `launchTask(options)` — For immediate executor-based tasks (single-story operations)
- `launchPolledTask(options)` — For server-polled bulk tasks. Calls `submitFn()` to get `taskId`, then polls every 2 seconds.
- `processingIds: Set<string>` — Tracks which story IDs are currently being processed (from both task types). Used by `StoryTable` to show processing indicators.

Both `launchTask` and `launchPolledTask` accept an optional `storyIds` parameter to populate `processingIds`.

### Story Table (`client/src/components/admin/StoryTable.tsx`)

Accepts `processingIds?: Set<string>`. When a story is processing:
- Row gets a light brand-colored background
- Spinning arrow icon appears next to the title
- Action buttons are replaced with "Processing..." text

## Concurrency

Server-side concurrency is configured via environment variables (see `.context/scheduler.md`):
- `CONCURRENCY_PREASSESS` (default: 10)
- `CONCURRENCY_ASSESS` (default: 10)
- `CONCURRENCY_SELECT` (default: 10)

The client sends up to 500 IDs in a single request. The server gates LLM calls through `Semaphore`.

## Limitations

- **In-memory only** — Tasks are lost on server restart. Client shows an error on next poll.
- **No deduplication** — Submitting the same stories twice creates two tasks. Semaphore prevents LLM overload.
- **No persistence** — Task history is not stored in the database.

## Key Files

| File | Purpose |
|------|---------|
| `server/src/lib/taskRegistry.ts` | In-memory task state |
| `server/src/lib/taskRegistry.test.ts` | Task registry unit tests |
| `server/src/services/analysis.ts` | Bulk wrapper functions |
| `server/src/routes/admin/stories.ts` | Bulk + poll endpoints |
| `server/src/schemas/story.ts` | `bulkStoryIdsSchema` validation |
| `client/src/lib/admin-api.ts` | Client API methods |
| `client/src/hooks/useBackgroundTasks.tsx` | Polling + processing ID tracking |
| `client/src/components/admin/StoryTable.tsx` | Processing indicator UI |
| `client/src/pages/admin/StoriesPage.tsx` | Wires bulk actions to polled tasks |
| `shared/types/index.ts` | `TaskState`, `BulkTaskType`, `BulkTaskStatus` types |
