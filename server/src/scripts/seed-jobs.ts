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
    prisma.jobRun.upsert({
      where: { jobName: 'social_auto_post' },
      update: {},
      create: { jobName: 'social_auto_post', cronExpression: '30 11 * * *', enabled: false },
    }),
    prisma.jobRun.upsert({
      where: { jobName: 'bluesky_update_metrics' },
      update: {},
      create: { jobName: 'bluesky_update_metrics', cronExpression: '0 */6 * * *', enabled: false },
    }),
    prisma.jobRun.upsert({
      where: { jobName: 'mastodon_update_metrics' },
      update: {},
      create: { jobName: 'mastodon_update_metrics', cronExpression: '0 4 * * *', enabled: false },
    }),
    prisma.jobRun.upsert({
      where: { jobName: 'generate_newsletter' },
      update: {},
      create: { jobName: 'generate_newsletter', cronExpression: '0 4 * * 6', enabled: false },
    }),
    // 6 AM Chile (CLST = UTC-3, verano oct-mar): 9 AM UTC
    // Ajustar a 0 10 * * * en invierno (abr-sep, CLT = UTC-4)
    prisma.jobRun.upsert({
      where: { jobName: 'send_fpic_newsletter' },
      update: {},
      create: { jobName: 'send_fpic_newsletter', cronExpression: '0 9 * * *', enabled: false },
    }),
    // 6:05 AM Chile (offset de 5 min respecto al FPIC)
    prisma.jobRun.upsert({
      where: { jobName: 'send_acuicultura_newsletter' },
      update: {},
      create: { jobName: 'send_acuicultura_newsletter', cronExpression: '5 9 * * *', enabled: false },
    }),
    // 6:10 AM Chile (offset de 10 min respecto al FPIC)
    prisma.jobRun.upsert({
      where: { jobName: 'send_chile_indigena_newsletter' },
      update: {},
      create: { jobName: 'send_chile_indigena_newsletter', cronExpression: '10 9 * * *', enabled: false },
    }),
    // 11 AM UTC = 8 AM Chile (después de que publish_stories corra a las 11 AM UTC)
    prisma.jobRun.upsert({
      where: { jobName: 'generate_chile_indigena_podcast' },
      update: {},
      create: { jobName: 'generate_chile_indigena_podcast', cronExpression: '30 14 * * *', enabled: false },
    }),
  ])

  console.log(`Seeded ${jobs.length} job runs (all disabled)`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
