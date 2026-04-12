import prisma from '../lib/prisma.js'
import { fetchOgImage } from '../lib/extract-og-image.js'

async function main() {
  const stories = await prisma.story.findMany({
    where: { status: 'published', imageUrl: null },
    select: { id: true, sourceUrl: true, slug: true },
    orderBy: { datePublished: 'desc' },
  })

  console.log(`Found ${stories.length} published stories without imageUrl`)

  let updated = 0
  let failed = 0

  for (let i = 0; i < stories.length; i++) {
    const story = stories[i]
    process.stdout.write(`[${i + 1}/${stories.length}] ${story.slug} ... `)

    const imageUrl = await fetchOgImage(story.sourceUrl)
    if (imageUrl) {
      await prisma.story.update({ where: { id: story.id }, data: { imageUrl } })
      updated++
      console.log(`OK (${imageUrl.slice(0, 60)}...)`)
    } else {
      failed++
      console.log('no image found')
    }

    // Small delay to avoid hammering source sites
    await new Promise((r) => setTimeout(r, 300))
  }

  console.log(`\nDone. Updated: ${updated}, no image: ${failed}`)
}

main().catch(console.error)
