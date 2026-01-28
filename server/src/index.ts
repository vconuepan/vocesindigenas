import prisma from './lib/prisma.js'
import app from './app.js'

const PORT = process.env.PORT || 3001

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)

  // TODO: Initialize scheduler after DB connection is confirmed
  // import('./jobs/scheduler.js').then(m => m.initScheduler())
})

process.on('SIGTERM', async () => {
  await prisma.$disconnect()
  process.exit(0)
})

export default app
