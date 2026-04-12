import prisma from '../lib/prisma.js'
import { getStoryIdsByStatus, bulkUpdateStatus } from '../services/story.js'
import { translateStoriesBatch } from '../services/translation.js'
import { fetchOgImage } from '../lib/extract-og-image.js'
import { createLogger } from '../lib/logger.js'

const log = createLogger('publish_stories')

async function backfillImages(ids: string[]): Promise<void> {
  const stories = await prisma.story.findMany({
    where: { id: { in: ids }, imageUrl: null },
    select: { id: true, sourceUrl: true },
  })

  await Promise.allSettled(
    stories.map(async (story) => {
      const imageUrl = await fetchOgImage(story.sourceUrl)
      if (imageUrl) {
        await prisma.story.update({ where: { id: story.id }, data: { imageUrl } })
        log.info({ storyId: story.id }, 'image extracted and saved')
      }
    }),
  )
}

export async function runPublishStories(): Promise<void> {
  log.info('starting publish job')

  const ids = await getStoryIdsByStatus('selected')
  if (ids.length === 0) {
    log.info('no selected stories to publish')
    return
  }

  log.info({ storyCount: ids.length }, 'publishing stories')

  const result = await bulkUpdateStatus(ids, 'published')

  log.info({ published: result.count }, 'publish job finished')

  const publishedIds = ids
  if (publishedIds.length > 0) {
    log.info({ count: publishedIds.length }, 'extracting og:image from source articles')
    await backfillImages(publishedIds)

    log.info({ count: publishedIds.length }, 'translating published stories to English')
    const { translated, failed } = await translateStoriesBatch(publishedIds)
    log.info({ translated, failed }, 'translation complete')
  }
}
