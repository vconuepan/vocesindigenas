# Admin Jobs Area Fixes

## Issues

1. **Toggle looks weird when activated** — `translate-x-4.5` is not a valid Tailwind v3 class, so the knob doesn't slide properly
2. **Edit panel cron update doesn't work** — Need to investigate; the code path looks correct but the panel UX may mask the result
3. **Cron-to-natural-language algorithm** — `cronToHuman()` exists but doesn't handle minute-level patterns (`*/5 * * * *`) or non-zero minutes (`30 9 * * *`)
4. **Show natural language for custom specs** — No live preview in custom cron input mode
5. **Show server time** — No server time endpoint or display on Jobs page

## Plan

### 1. Fix toggle knob position

**File:** `client/src/components/admin/JobsTable.tsx:243`

The `EnabledToggle` uses `translate-x-4.5` which isn't a standard Tailwind class. The track is `w-9` (36px), knob is `w-3.5` (14px), off position is `translate-x-1` (4px). On position should be `36 - 14 - 4 = 18px`.

**Fix:** Replace `translate-x-4.5` with `translate-x-[18px]` (arbitrary value).

### 2. Fix cron editing in edit panel

**File:** `client/src/components/admin/CronEditor.tsx`

The `CronEditor` receives `onSave={onClose}` from `JobEditPanel`. After `handleSave` calls `mutateAsync`, it calls `onSave()` which closes the panel. The mutation itself should succeed.

**Investigation needed:** I'll test by adding console logging or checking the network tab. However, there's a potential issue: when the edit panel's `Dialog` has `onClose={onClose}`, and the CronEditor's save button is inside a `Dialog`, clicking "Save" might trigger the Dialog's own close handler *before* the mutation fires. This could be an event propagation issue with Headless UI.

**Approach:** Restructure `JobEditPanel` so that `CronEditor` does NOT close the panel on save. Instead, the panel should show the updated value in-place (with `initialEditing` remaining true). This also improves UX since the user can verify the change took effect. The panel's Close button handles dismissal.

**Changes:**
- Remove `onSave={onClose}` from the CronEditor in `JobEditPanel` — let save just update the schedule and show the success toast
- Remove `onCancel={onClose}` — let cancel reset the editor state without closing the panel
- The panel already has its own Close button in the footer

### 3. Extend `cronToHuman()` algorithm

**File:** `client/src/lib/cron.ts`

Add support for these patterns (roughly in order of usefulness):

| Pattern | Example | Output |
|---------|---------|--------|
| Every N minutes | `*/5 * * * *` | "Every 5 minutes" |
| Every N minutes (restricted hours) | `*/15 9-17 * * *` | "Every 15 min, 9 AM – 5 PM" |
| Non-zero minutes with specific hours | `30 9 * * *` | "Daily at 9:30 AM" |
| Non-zero minutes with multiple hours | `30 9,21 * * *` | "Daily at 9:30 AM, 9:30 PM" |
| Non-zero minutes with every N hours | `15 */6 * * *` | "Every 6 hours at :15" |
| Hour ranges | `0 9-17 * * *` | "Every hour, 9 AM – 5 PM" |

**Implementation approach:**
- Refactor `formatHour()` to accept optional minutes (e.g., `formatTime(hour, minute)`)
- Add `*/N * * * *` pattern matching early in the function
- Support non-zero minute field throughout existing hour patterns
- Add hour range parsing (`N-M` pattern)

### 4. Show live preview for custom cron input

**File:** `client/src/components/admin/CronEditor.tsx`

In the custom mode section (lines 103-119), add a live preview below the input that shows `cronToHuman(customValue)`. Only show it when the value is a valid 5-part expression and produces a human-readable result (i.e., doesn't fall back to the raw expression).

**Changes:**
- Below the `min hour day month weekday` hint, render the `cronToHuman()` result if it differs from the raw expression
- Style it subtly (small text, muted color) so it doesn't distract

### 5. Show server time on Jobs page

**Server:** Add `serverTime` and `timezone` to the `GET /api/admin/jobs` response (avoids needing a separate endpoint). The timezone can be derived from `Intl.DateTimeFormat().resolvedOptions().timeZone`.

**Client:** Display server time in the `JobsPage` header area. Show the timezone name and current time. Since the jobs page already auto-refreshes every 10 seconds, the time will stay reasonably current.

**Changes:**

**Server files:**
- `server/src/routes/admin/jobs.ts` — Return `{ jobs, serverTime, timezone }` instead of just the jobs array
- `server/src/services/job.ts` — Add server time/timezone to the response

**Client files:**
- `client/src/hooks/useJobs.ts` — Update types to expect `{ jobs, serverTime, timezone }` wrapper
- `client/src/pages/admin/JobsPage.tsx` — Display server time below the page header description
- `shared/types/index.ts` — Add `JobsResponse` type if needed

**Wait** — changing the response shape of `GET /api/admin/jobs` from an array to an object is a breaking change. Safer approach: add a separate lightweight endpoint or include server info as response headers.

**Revised approach:** Add `serverTime` and `timezone` as custom response headers (`X-Server-Time`, `X-Server-Timezone`) on the jobs list endpoint. The client reads them from the response. This avoids changing the response shape.

**Chosen approach:** Add a `GET /api/admin/server-time` endpoint that returns `{ time, timezone }`. The Jobs page fetches the timezone once on mount, then runs a local `setInterval` clock offset to the server timezone. This gives a live ticking clock without constant server calls.

**User decisions:**
- Server time: Live clock with timezone (ticking every second)
- Edit panel save: Keep panel open after save (remove `onSave={onClose}`)

## Test Plan

### Unit Tests (`client/src/lib/cron.test.ts`)
- Add tests for all new `cronToHuman()` patterns (every N minutes, non-zero minutes, hour ranges)
- Verify existing tests still pass

### Component Tests
- `CronEditor` — test that custom mode shows live preview text
- `EnabledToggle` — verify the toggle renders correctly (optional since it's a CSS fix)

### Manual Testing
- Toggle a job on/off in the admin UI — knob should slide smoothly
- Edit a cron spec in the edit panel — save should work and show success toast
- Enter custom cron expressions — verify live preview appears
- Check server time display on the Jobs page

## Files to Modify

| File | Changes |
|------|---------|
| `client/src/components/admin/JobsTable.tsx` | Fix toggle CSS, remove `onSave`/`onCancel` from panel CronEditor |
| `client/src/components/admin/CronEditor.tsx` | Add live preview in custom mode |
| `client/src/lib/cron.ts` | Extend `cronToHuman()` for more patterns |
| `client/src/lib/cron.test.ts` | Add tests for new patterns |
| `client/src/pages/admin/JobsPage.tsx` | Display server time |
| `client/src/hooks/useJobs.ts` | Add `useServerTime` hook |
| `server/src/routes/admin/jobs.ts` | Add `GET /server-time` endpoint |
