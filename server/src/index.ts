import prisma from './lib/prisma.js'
import { createLogger } from './lib/logger.js'
import { initScheduler, stopScheduler } from './jobs/scheduler.js'
import { taskRegistry } from './lib/taskRegistry.js'
import app from './app.js'

const log = createLogger('server')
const PORT = process.env.PORT || 3001

const DRAIN_POLL_MS = 500
const FORCE_EXIT_MS = 10_000

let shuttingDown = false

const server = app.listen(PORT, () => {
  log.info({ port: PORT }, 'server started')

  Promise.resolve().then(() => initScheduler()).catch(err => {
    log.error({ err }, 'scheduler initialization failed')
  })
})

export async function shutdown(): Promise<void> {
  if (shuttingDown) return
  shuttingDown = true

  log.info('graceful shutdown initiated')

  // Force-exit safety net
  const forceTimer = setTimeout(() => {
    log.error({ running: taskRegistry.getProcessingStoryIds().length }, 'forced exit after timeout')
    process.exit(1)
  }, FORCE_EXIT_MS)
  forceTimer.unref()

  // 1. Stop scheduler (prevent new jobs)
  stopScheduler()

  // 2. Close HTTP server (stop accepting new connections)
  await new Promise<void>((resolve) => {
    server.close(() => resolve())
  })

  // 3. Wait for running tasks to drain (with deadline so cleanup always runs)
  const drainDeadline = Date.now() + FORCE_EXIT_MS - 1000
  while (taskRegistry.getProcessingStoryIds().length > 0) {
    if (Date.now() > drainDeadline) {
      log.warn({ running: taskRegistry.getProcessingStoryIds().length }, 'drain timeout exceeded, proceeding with shutdown')
      break
    }
    log.info({ running: taskRegistry.getProcessingStoryIds().length }, 'waiting for tasks to drain')
    await new Promise((resolve) => setTimeout(resolve, DRAIN_POLL_MS))
  }

  // 4. Clean up task registry
  taskRegistry.destroy()

  // 5. Disconnect database
  await prisma.$disconnect()

  log.info('graceful shutdown complete')
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

/** Reset shutdown state (for testing only). */
export function _resetShutdownState(): void {
  shuttingDown = false
}

export default app
