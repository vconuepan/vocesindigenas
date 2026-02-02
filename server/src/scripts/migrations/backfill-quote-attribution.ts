/**
 * Backfill quote_attribution for published stories that have a quote.
 *
 * Usage:
 *   npm run migration:backfill-quote-attribution --prefix server              # batch mode (updates DB)
 *   npm run migration:backfill-quote-attribution:test --prefix server         # test mode (first 3, no writes)
 *   npm run migration:backfill-quote-attribution --prefix server -- --override  # override mode (re-processes all)
 */

import { PrismaClient } from '@prisma/client'
import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage } from '@langchain/core/messages'
import { Semaphore } from '../../lib/semaphore.js'
import { extractQuoteAttributionSchema } from '../../schemas/llm.js'
import { config } from '../../config.js'

const TEST_MODE = process.argv.includes('--test')
const OVERRIDE_MODE = process.argv.includes('--override')
const CONCURRENCY = 20
const BATCH_SIZE = 100

const prisma = new PrismaClient()
const llm = new ChatOpenAI({
  model: config.llm.models.small.name,
  reasoning: { effort: config.llm.models.small.reasoningEffort },
  maxRetries: 3,
})
const structuredLlm = llm.withStructuredOutput(extractQuoteAttributionSchema)
const semaphore = new Semaphore(CONCURRENCY)

async function processSingle(story: {
  id: string
  quote: string
  sourceTitle: string
  feedTitle: string
}): Promise<{
  id: string
  quote: string
  quoteAttribution: string
}> {
  const result = await structuredLlm.invoke([
    new HumanMessage(
      `Determine the attribution for this quote from a news article.\n\n` +
        `Article title: "${story.sourceTitle}"\n` +
        `Publisher: ${story.feedTitle}\n` +
        `Quote: "${story.quote}"\n\n` +
        `Rules:\n` +
        `- If quoting a person: use their full name and title/role (e.g. "Maria Helena Semedo, FAO Deputy Director").\n` +
        `- If quoting an organization or publication: use the organization name.\n` +
        `- If the quote is a striking sentence from the article (not a direct quote from a person): use "Original article".\n` +
        `- Return the quote cleaned up: strip embedded speaker/publication name, surrounding quotation marks, and leftover punctuation. ` +
        `Replace any inner double quotes with single quotes (' '). The quote field should contain only the quoted text itself.`,
    ),
  ])
  return { id: story.id, quote: result.quote, quoteAttribution: result.quoteAttribution }
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
      where: {
        status: 'published',
        quote: { not: null },
        ...(!OVERRIDE_MODE && { quoteAttribution: null }),
      },
      select: {
        id: true,
        quote: true,
        sourceTitle: true,
        feed: { select: { title: true } },
      },
      take: TEST_MODE ? 3 : BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
    })

    if (stories.length === 0) break

    const results = await Promise.allSettled(
      stories.map((story) =>
        semaphore.run(async () => {
          const result = await processSingle({
            id: story.id,
            quote: story.quote!,
            sourceTitle: story.sourceTitle,
            feedTitle: story.feed.title,
          })

          const changed = result.quote !== story.quote!
          console.log(`\n  [${story.sourceTitle.slice(0, 60)}]`)
          console.log(`  Original:    "${story.quote}"`)
          console.log(`  Cleaned:     "${result.quote}"${changed ? ' ← CHANGED' : ''}`)
          console.log(`  Attribution: "${result.quoteAttribution}"`)

          if (!TEST_MODE) {
            await prisma.story.update({
              where: { id: result.id },
              data: { quote: result.quote, quoteAttribution: result.quoteAttribution },
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
