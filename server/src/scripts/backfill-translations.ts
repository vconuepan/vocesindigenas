import prisma from '../lib/prisma.js'
import { translateStoriesBatch } from '../services/translation.js'
import { createLogger } from '../lib/logger.js'

const log = createLogger('backfill-translations')

async function main() {
  const stories = await prisma.story.findMany({
    where: {
      status: 'published',
      titleEn: null,
      title: { not: null },
    },
    select: { id: true },
    orderBy: { datePublished: 'desc' },
  })

  log.info({ total: stories.length }, 'stories to translate')
  const ids = stories.map((s: { id: string }) => s.id)

  const BATCH = 20
  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH)
    log.info({ progress: `${i}/${ids.length}` }, 'translating batch')
    await translateStoriesBatch(batch)
  }

  log.info('backfill complete')
}

main().catch(console.error)
