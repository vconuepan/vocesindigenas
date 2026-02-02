/**
 * Backfill title_label and clean up colon-prefixed titles for existing stories.
 *
 * Usage:
 *   npm run migration:backfill-title-label --prefix server          # batch mode (updates DB)
 *   npm run migration:backfill-title-label:test --prefix server     # test mode (first 3, no writes)
 */

import { PrismaClient } from '@prisma/client'
import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage } from '@langchain/core/messages'
import { Semaphore } from '../../lib/semaphore.js'
import { extractTitleLabelSchema } from '../../schemas/llm.js'
import { config } from '../../config.js'

const TEST_MODE = process.argv.includes('--test')
const OVERRIDE_MODE = process.argv.includes('--override')
const CONCURRENCY = 10
const BATCH_SIZE = 100

const prisma = new PrismaClient()
const llm = new ChatOpenAI({
  model: config.llm.models.small.name,
  reasoning: { effort: config.llm.models.small.reasoningEffort },
  maxRetries: 3,
})
const structuredLlm = llm.withStructuredOutput(extractTitleLabelSchema)
const semaphore = new Semaphore(CONCURRENCY)

async function processSingle(story: { id: string; title: string }): Promise<{
  id: string
  originalTitle: string
  titleLabel: string
  title: string
}> {
  const result = await structuredLlm.invoke([
    new HumanMessage(
      `Split this news headline into an ultra-short topic label and a standalone headline.\n\n` +
        `The label must be 1-3 words, a tight noun phrase — no conjunctions, no "and".\n` +
        `The headline must NOT use the "Label: headline" colon pattern. Strip the topic prefix and make it a standalone sentence.\n\n` +
        `Examples:\n` +
        `  Input: "EU AI Act: whistleblower channel and proposed timeline changes could shape enforcement"\n` +
        `  Label: "EU AI Act"\n` +
        `  Title: "Whistleblower channel and proposed timeline changes could shape AI Act enforcement"\n\n` +
        `  Input: "Carbon inequality and climate policy: Oxfam says the richest 1% used a 1.5°C fair share carbon budget within 10 days"\n` +
        `  Label: "Carbon inequality"\n` +
        `  Title: "Oxfam says the richest 1% used a 1.5°C fair share carbon budget within 10 days"\n\n` +
        `Input: "${story.title}"`,
    ),
  ])
  return { id: story.id, originalTitle: story.title, titleLabel: result.titleLabel, title: result.title }
}

async function main() {
  const mode = TEST_MODE ? 'TEST (no DB writes)' : OVERRIDE_MODE ? 'OVERRIDE' : 'BATCH'
  console.log(`Mode: ${mode}`)
  console.log(`Concurrency: ${CONCURRENCY}`)
  console.log(`Model: ${config.llm.models.small.name}`)

  let cursor: string | undefined
  let processed = 0
  let failed = 0

  while (true) {
    const stories = await prisma.story.findMany({
      where: OVERRIDE_MODE
        ? { status: 'published', title: { not: null } }
        : { title: { not: null, contains: ':' } },
      select: { id: true, title: true, titleLabel: true },
      take: TEST_MODE ? 3 : BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
    })

    if (stories.length === 0) break

    const results = await Promise.allSettled(
      stories.map((story) =>
        semaphore.run(async () => {
          const result = await processSingle(story as { id: string; title: string })

          const labelChanged = result.titleLabel !== (story as any).titleLabel
          const titleChanged = result.title !== result.originalTitle
          console.log(`\n  Original:  "${result.originalTitle}"`)
          console.log(`  Label:     "${result.titleLabel}"${labelChanged ? ' ← CHANGED' : ''}`)
          console.log(`  Title:     "${result.title}"${titleChanged ? ' ← CHANGED' : ''}`)

          if (!TEST_MODE) {
            await prisma.story.update({
              where: { id: result.id },
              data: { titleLabel: result.titleLabel, title: result.title },
            })
          }

          processed++

          return result
        }),
      ),
    )

    for (const result of results) {
      if (result.status === 'rejected') {
        failed++
        console.error('Failed:', result.reason)
      }
    }

    cursor = stories[stories.length - 1].id

    if (TEST_MODE) break
  }

  console.log(`\nDone. Processed: ${processed}, Failed: ${failed}`)
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
