# Automate Newsletter Generation Job

## Goal

Add a new cron job `generate_newsletter` that automatically creates, populates, and test-sends a newsletter every Saturday at 4am.

## Context

The newsletter pipeline already exists as individual service functions called from admin API routes. This job chains them together:

1. `createNewsletter({ title })` — create a draft newsletter
2. `assignStories(id)` — populate longlist from last 7 days of published stories
3. `selectStoriesForNewsletter(id)` — LLM picks 2 stories per issue category (4x2)
4. `generateContent(id)` — LLM editorial intro + template-based story blocks (markdown)
5. `generateHtmlContent(id)` — convert markdown to HTML email
6. `sendTest(id)` — send to admin/test segment via Plunk

## Newsletter Title Format

The title should reflect the calendar week, e.g. **"Week 7, 2026"**.

Computed from the job's run date using ISO week numbering.

## Changes

### 1. New job handler: `server/src/jobs/generateNewsletter.ts`

```ts
import { createLogger } from '../lib/logger.js'
import {
  createNewsletter,
  assignStories,
  selectStoriesForNewsletter,
  generateContent,
  generateHtmlContent,
  sendTest,
} from '../services/newsletter.js'

const log = createLogger('generate_newsletter')

function getWeekTitle(date: Date): string {
  // ISO week number calculation
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `Week ${weekNo}, ${d.getUTCFullYear()}`
}

export async function runGenerateNewsletter(): Promise<void> {
  const title = getWeekTitle(new Date())
  log.info({ title }, 'starting newsletter generation')

  // Step 1: Create newsletter
  const newsletter = await createNewsletter({ title })
  log.info({ newsletterId: newsletter.id }, 'newsletter created')

  // Step 2: Assign stories (last 7 days of published)
  await assignStories(newsletter.id)
  log.info({ newsletterId: newsletter.id }, 'stories assigned')

  // Step 3: LLM selection (4x2)
  await selectStoriesForNewsletter(newsletter.id)
  log.info({ newsletterId: newsletter.id }, 'stories selected')

  // Step 4: Generate markdown content
  await generateContent(newsletter.id)
  log.info({ newsletterId: newsletter.id }, 'content generated')

  // Step 5: Convert to HTML
  await generateHtmlContent(newsletter.id)
  log.info({ newsletterId: newsletter.id }, 'HTML generated')

  // Step 6: Send test email
  await sendTest(newsletter.id)
  log.info({ newsletterId: newsletter.id }, 'test email sent')
}
```

### 2. Register in handlers: `server/src/jobs/handlers.ts`

Add import and entry:
```ts
import { runGenerateNewsletter } from './generateNewsletter.js'

// In JOB_HANDLERS:
generate_newsletter: runGenerateNewsletter,
```

### 3. Add to seed script: `server/src/scripts/seed-jobs.ts`

```ts
prisma.jobRun.upsert({
  where: { jobName: 'generate_newsletter' },
  update: {},
  create: { jobName: 'generate_newsletter', cronExpression: '0 4 * * 6', enabled: false },
}),
```

### 4. Test: `server/src/jobs/__tests__/generateNewsletter.test.ts`

Unit test that:
- Mocks all 6 newsletter service functions
- Verifies the pipeline calls them in order with the correct newsletter ID
- Verifies the title contains the correct week number
- Tests `getWeekTitle` helper with known dates

## Files touched

| File | Change |
|------|--------|
| `server/src/jobs/generateNewsletter.ts` | **New** — job handler |
| `server/src/jobs/__tests__/generateNewsletter.test.ts` | **New** — unit tests |
| `server/src/jobs/handlers.ts` | Add import + handler entry |
| `server/src/scripts/seed-jobs.ts` | Add upsert for `generate_newsletter` |

## Decisions

- **Title format**: "Week 7, 2026" (ISO week number + year)
- **No stories**: Skip silently — log a warning and return early, no newsletter created, no error recorded

## Out of scope

- No database migration needed (job_runs row created via seed script / admin UI)
- No config changes needed (reuses existing `config.newsletter.*` and `config.content.storyAssignmentDays`)
- No admin UI changes (existing Jobs page already shows all job_runs)
- Live send (only test send for now, per requirements)
