import prisma from '../lib/prisma.js'
import { config } from '../config.js'
import { StoryStatus } from '@prisma/client'
import { createLogger } from '../lib/logger.js'
import { createEditorial, generateEditorialContent, getWeekLabel } from '../services/editorial.js'

const log = createLogger('generate_editorial')

export async function runGenerateEditorial(): Promise<void> {
  const count = await prisma.story.count({
    where: {
      status: StoryStatus.published,
      dateCrawled: { gte: new Date(Date.now() - config.content.storyAssignmentDays * 24 * 60 * 60 * 1000) },
    },
  })

  if (count === 0) {
    log.info('no recent published stories, skipping editorial generation')
    return
  }

  const weekLabel = getWeekLabel(new Date())
  const title = `Editorial — ${weekLabel}`

  const existing = await prisma.editorial.findFirst({ where: { title } })
  if (existing) {
    log.info({ title, editorialId: existing.id }, 'editorial already exists for this week, skipping')
    return
  }

  log.info({ title, recentStoryCount: count }, 'starting editorial generation')

  const editorial = await createEditorial({ title })
  log.info({ editorialId: editorial.id }, 'editorial record created')

  try {
    await generateEditorialContent(editorial.id)
    log.info({ editorialId: editorial.id }, 'editorial content generated — pending review')
  } catch (err) {
    await prisma.editorial.delete({ where: { id: editorial.id } })
    throw err
  }
}
