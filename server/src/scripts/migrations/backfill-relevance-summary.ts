/**
 * Backfill relevance_summary for published stories that have relevance reasons.
 *
 * Usage:
 *   npm run migration:backfill-relevance-summary --prefix server              # batch mode (updates DB)
 *   npm run migration:backfill-relevance-summary:test --prefix server         # test mode (first 3, no writes)
 *   npm run migration:backfill-relevance-summary --prefix server -- --override  # override mode (re-processes all)
 */

import { PrismaClient } from '@prisma/client'
import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage } from '@langchain/core/messages'
import { Semaphore } from '../../lib/semaphore.js'
import { extractRelevanceSummarySchema } from '../../schemas/llm.js'
import { config } from '../../config.js'

const TEST_MODE = process.argv.includes('--test')
const OVERRIDE_MODE = process.argv.includes('--override')
const CONCURRENCY = 20
const BATCH_SIZE = 100

const prisma = new PrismaClient()
const llm = new ChatOpenAI({
  model: config.llm.models.medium.name,
  reasoning: { effort: config.llm.models.medium.reasoningEffort },
  maxRetries: 3,
})
const structuredLlm = llm.withStructuredOutput(extractRelevanceSummarySchema)
const semaphore = new Semaphore(CONCURRENCY)

async function processSingle(story: {
  id: string
  sourceTitle: string
  summary: string | null
  relevanceReasons: string
  antifactors: string | null
  relevance: number | null
}): Promise<{
  id: string
  relevanceSummary: string
}> {
  const summaryLine = story.summary
    ? `\nSummary: "${story.summary}"\n`
    : ''
  const antifactorsLine = story.antifactors
    ? `\nLimiting factors:\n${story.antifactors}\n`
    : ''
  const ratingLine = story.relevance != null
    ? `\nConservative rating: ${story.relevance}/10\n`
    : ''

  const result = await structuredLlm.invoke([
    new HumanMessage(
      `Summarize the following relevance analysis into one high-level sentence (20-25 words).\n\n` +
        `Rules:\n` +
        `- Do not refer to "the article". Focus on the subject matter itself.\n` +
        `  Bad: "The article is relevant because it reports on a significant legal action ..."\n` +
        `  Good: "The legal action could lead to stricter climate policies in 32 countries."\n` +
        `- Summarize the overall relevance into one high-level sentence.\n` +
        `  Good: "Overall, the event slows down progress toward SDG 3 in Sub-Saharan Africa but is unlikely to change the underlying positive trend."\n` +
        `- Write for a smart 16-year-old, not an expert. Use plain words — no jargon, insider terms, or acronyms unless they're household names.\n` +
        `- Include concrete numbers when the context provides them (e.g. number of people affected, dollar amounts, percentages). A number often beats an adjective.\n` +
        `  Good: "Cutting $4.5 billion in PEPFAR funding threatens HIV treatment for 20 million people across sub-Saharan Africa."\n\n` +
        `Article title: "${story.sourceTitle}"\n` +
        summaryLine +
        `Relevance factors:\n${story.relevanceReasons}\n` +
        antifactorsLine +
        ratingLine,
    ),
  ])
  return { id: story.id, relevanceSummary: result.relevanceSummary }
}

async function main() {
  const mode = TEST_MODE ? 'TEST (no DB writes)' : OVERRIDE_MODE ? 'OVERRIDE' : 'BATCH'
  console.log(`Mode: ${mode}`)
  console.log(`Concurrency: ${CONCURRENCY}`)
  console.log(`Model: ${config.llm.models.medium.name}`)

  let cursor: string | undefined
  let processed = 0
  let failed = 0

  while (true) {
    const stories = await prisma.story.findMany({
      where: {
        status: 'published',
        relevanceReasons: { not: null },
        ...(!OVERRIDE_MODE && { relevanceSummary: null }),
      },
      select: {
        id: true,
        sourceTitle: true,
        summary: true,
        relevanceReasons: true,
        antifactors: true,
        relevance: true,
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
            sourceTitle: story.sourceTitle,
            summary: story.summary,
            relevanceReasons: story.relevanceReasons!,
            antifactors: story.antifactors,
            relevance: story.relevance,
          })

          console.log(`\n  [${story.sourceTitle.slice(0, 60)}]`)
          console.log(`  Summary: "${result.relevanceSummary}"`)

          if (!TEST_MODE) {
            await prisma.story.update({
              where: { id: result.id },
              data: { relevanceSummary: result.relevanceSummary },
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
