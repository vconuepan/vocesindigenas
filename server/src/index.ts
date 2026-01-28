import prisma from './lib/prisma.js'
import app from './app.js'

const PORT = process.env.PORT || 3001

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)

  import('./jobs/scheduler.js').then(m => m.initScheduler()).catch(err => {
    console.error('[Scheduler] Failed to initialize:', err)
  })
})

process.on('SIGTERM', async () => {
  const { stopScheduler } = await import('./jobs/scheduler.js')
  stopScheduler()
  await prisma.$disconnect()
  process.exit(0)
})

export default app
