import prisma from './lib/prisma.js'
import { createLogger } from './lib/logger.js'
import app from './app.js'

const log = createLogger('server')
const PORT = process.env.PORT || 3001

app.listen(PORT, () => {
  log.info({ port: PORT }, 'server started')

  import('./jobs/scheduler.js').then(m => m.initScheduler()).catch(err => {
    log.error({ err }, 'scheduler initialization failed')
  })
})

process.on('SIGTERM', async () => {
  const { stopScheduler } = await import('./jobs/scheduler.js')
  stopScheduler()
  await prisma.$disconnect()
  process.exit(0)
})

export default app
