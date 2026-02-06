# Plan: Seed Jobs + User-Friendly Cron Editor

## Problem

The admin Jobs page shows "No jobs configured" because the `job_runs` table is empty. The seed script already contains the 4 job definitions, but it hasn't been run. Additionally, editing cron expressions requires knowing cron syntax by heart — the current editor is a raw text input.

## Requirements

1. **Seed the database** with the 4 predefined jobs (all disabled by default)
2. **Replace the raw cron text input** with a user-friendly cron schedule builder that doesn't require knowing cron syntax

## Implementation

### Phase 1: Seed the Database

Run `npm run db:seed --prefix server` to populate the `job_runs` table. The seed script already has the correct upsert logic for all 4 jobs.

### Phase 2: Build a Friendly Cron Editor

Replace the `CronEditor` component with a dropdown-based schedule builder. The UI will offer common presets and a structured builder:

**Approach: Preset + Custom Builder**

The editor will have two modes:

1. **Presets dropdown** — Quick selections like:
   - Every 6 hours
   - Every 12 hours
   - Daily at [hour picker]
   - Mon/Wed/Fri at [hour picker]
   - Weekdays at [hour picker]
   - Custom (shows the raw cron input as fallback)

2. **Display** — When not editing, show a human-readable description of the current cron (e.g., "Every 6 hours" or "Mon, Wed, Fri at 9:00 AM") instead of the raw expression.

**Component structure:**
- `CronEditor.tsx` — Refactored to show human-readable text + open a popover/dropdown for editing
- Helper function `cronToHuman(expr: string): string` — Converts common cron patterns to readable text
- Helper function to generate cron expressions from preset selections

**No new dependencies** — built with plain HTML select/input elements styled with Tailwind.

### Files Changed

| File | Change |
|------|--------|
| `client/src/components/admin/CronEditor.tsx` | Replace raw input with preset dropdown + hour picker |
| `client/src/lib/cron.ts` | New: cron↔human conversion helpers |
| `client/src/lib/cron.test.ts` | Tests for cron helpers |

### Out of Scope

- No changes to backend (cron validation already works)
- No changes to database schema
- No new job types or custom job creation UI
