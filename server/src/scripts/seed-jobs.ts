import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const jobs = await Promise.all([
    prisma.jobRun.upsert({
      where: { jobName: 'crawl_feeds' },
      update: {},
      create: { jobName: 'crawl_feeds', cronExpression: '0 */6 * * *', enabled: false },
    }),
    prisma.jobRun.upsert({
      where: { jobName: 'preassess_stories' },
      update: {},
      create: { jobName: 'preassess_stories', cronExpression: '0 1,7,13,19 * * *', enabled: false },
    }),
    prisma.jobRun.upsert({
      where: { jobName: 'assess_stories' },
      update: {},
      create: { jobName: 'assess_stories', cronExpression: '0 9,21 * * *', enabled: false },
    }),
    prisma.jobRun.upsert({
      where: { jobName: 'select_stories' },
      update: {},
      create: { jobName: 'select_stories', cronExpression: '0 10 * * *', enabled: false },
    }),
    prisma.jobRun.upsert({
      where: { jobName: 'publish_stories' },
      update: {},
      create: { jobName: 'publish_stories', cronExpression: '0 11 * * *', enabled: false },
    }),
  ])

  console.log(`Seeded ${jobs.length} job runs (all disabled)`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
