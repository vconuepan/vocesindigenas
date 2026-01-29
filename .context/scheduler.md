# Job Scheduler

The scheduler runs jobs in-process using `node-cron`, with configuration and run history stored in the `job_runs` database table. No external job queue infrastructure is needed.

## How It Works

On server startup, `initScheduler()`:
1. Loads all job definitions from the `job_runs` table
2. For each enabled job with a valid cron expression, registers a cron task
3. Checks for overdue jobs (last run + interval < now) and runs them immediately
4. Logs which jobs were registered, skipped, or triggered

## Reliability Features

**Overlap prevention**: Each job checks a running flag before executing. If a previous run is still in progress, the new invocation is skipped.

**Overdue detection**: On startup, the scheduler compares each job's `lastCompletedAt` against its cron interval. Jobs that missed their window (e.g., server was down) run immediately.

**Error tracking**: Each job run updates `lastStartedAt`, `lastCompletedAt`, and `lastError` in the database. Failed jobs don't block subsequent runs.

**Manual triggers**: Every job can be triggered via `POST /api/admin/jobs/:jobName/run`, which runs the job in the background regardless of schedule.

## Registered Jobs

| Job Name | Handler | Default Schedule |
|----------|---------|-----------------|
| `crawl_feeds` | `runCrawlFeeds` | `0 */6 * * *` (every 6h) |
| `preassess_stories` | `runPreassessStories` | Configurable |
| `assess_stories` | `runAssessStories` | Configurable |
| `select_stories` | `runSelectStories` | Configurable |

## Adding a New Job

1. Create handler in `server/src/jobs/yourJob.ts` exporting an `async function runYourJob(): Promise<void>`
2. Register handler in `server/src/jobs/scheduler.ts` by adding to the `JOB_HANDLERS` map
3. Add a row to `job_runs` table (via migration or seed) with `jobName`, `cronExpression`, and `enabled`

## Admin API

| Endpoint | Description |
|----------|-------------|
| `GET /api/admin/jobs` | List all jobs with status, last run times, errors |
| `PUT /api/admin/jobs/:jobName` | Update cron expression or enabled flag |
| `POST /api/admin/jobs/:jobName/run` | Manually trigger a job (runs in background) |

## Key Files

| File | Role |
|------|------|
| `server/src/jobs/scheduler.ts` | Core scheduler: init, cron registration, overlap prevention |
| `server/src/jobs/crawlFeeds.ts` | RSS crawl job handler |
| `server/src/jobs/preassessStories.ts` | Pre-assessment job handler |
| `server/src/jobs/assessStories.ts` | Full assessment job handler |
| `server/src/jobs/selectStories.ts` | Selection job handler |
| `server/src/routes/admin/jobs.ts` | Admin API for job management |
