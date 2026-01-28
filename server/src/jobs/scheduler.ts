/**
 * Job scheduler using node-cron.
 *
 * Reads job configurations from the job_runs table and registers
 * cron jobs accordingly. On startup, checks for overdue jobs and
 * runs them immediately.
 *
 * This module will be fully implemented in Phase 2 when the database
 * layer and crawling services are in place.
 */

// import cron from 'node-cron'

export async function initScheduler(): Promise<void> {
  console.log('[Scheduler] Initializing...')

  // TODO Phase 2: Read job_runs from database
  // TODO Phase 2: Register cron jobs for each enabled job
  // TODO Phase 2: Check for overdue jobs and run catch-up

  console.log('[Scheduler] Ready (no jobs registered yet)')
}
