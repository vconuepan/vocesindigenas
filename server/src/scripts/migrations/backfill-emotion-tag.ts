/**
 * Backfill emotionTag for published stories that have no valid emotion tag.
 *
 * Step 1: Sets all published stories with emotionTag = 'surprising' to null.
 * Step 2: Runs LLM emotion classification on all published stories with null emotionTag.
 *
 * Usage:
 *   npm run migration:backfill-emotion-tag --prefix server              # batch mode (updates DB)
 *   npm run migration:backfill-emotion-tag:test --prefix server         # test mode (first batch, no writes)
 *   npm run migration:backfill-emotion-tag --prefix server -- --override  # override mode (re-processes all published)
 */

import { PrismaClient, EmotionTag } from '@prisma/client'
import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage } from '@langchain/core/messages'
import { z } from 'zod'
import { Semaphore } from '../../lib/semaphore.js'
import { config } from '../../config.js'
import { EMOTION_TAGS_PROMPT_BLOCK, formatArticlesBlock } from '../../prompts/shared.js'

const TEST_MODE = process.argv.includes('--test')
const OVERRIDE_MODE = process.argv.includes('--override')
const CONCURRENCY = 5
const BATCH_SIZE = config.preassess.batchSize // 10

const prisma = new PrismaClient()
const llm = new ChatOpenAI({
  model: config.llm.models.small.name,
  reasoning: { effort: config.llm.models.small.reasoningEffort },
  maxRetries: 3,
})

const emotionTagSchema = z.enum(['uplifting', 'frustrating', 'scary', 'calm'])

const resultSchema = z.object({
  articles: z.array(
    z.object({
      articleId: z.string(),
      issueSlug: z.string(),
      emotionTag: emotionTagSchema,
    }),
  ),
})

const structuredLlm = llm.withStructuredOutput(resultSchema)
const semaphore = new Semaphore(CONCURRENCY)

function buildPrompt(
  stories: { id: string; sourceTitle: string; sourceContent: string }[],
  fallbackSlug: string,
): string {
  // Map DB field names to the shared prompt format
  const mapped = stories.map((s) => ({ id: s.id, title: s.sourceTitle, content: s.sourceContent }))

  return `<ROLE>
You are an emotion classifier analyzing news articles.
</ROLE>

<GOAL>
For each article: assign an emotion tag based on how the article affects readers.
Use issue slug "${fallbackSlug}" for all articles (issue classification is not needed).
Do not rate the articles.
</GOAL>

${EMOTION_TAGS_PROMPT_BLOCK}

${formatArticlesBlock(mapped)}`
}

async function main() {
  const mode = TEST_MODE ? 'TEST (no DB writes)' : OVERRIDE_MODE ? 'OVERRIDE' : 'BATCH'
  console.log(`Mode: ${mode}`)
  console.log(`Concurrency: ${CONCURRENCY}, Batch size: ${BATCH_SIZE}`)
  console.log(`Model: ${config.llm.models.small.name}`)

  // Step 1: Null out 'surprising' emotion tags
  // Use raw query since 'surprising' is no longer in the Prisma enum
  if (TEST_MODE) {
    const count: [{ count: bigint }] = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as count FROM "stories" WHERE "emotion_tag" = 'surprising' AND "status" = 'published'`,
    )
    console.log(`\nStep 1: Would set ${count[0].count} published stories with 'surprising' emotion to null (test mode, no writes)`)
  } else {
    const nulled = await prisma.$executeRawUnsafe(
      `UPDATE "stories" SET "emotion_tag" = NULL WHERE "emotion_tag" = 'surprising' AND "status" = 'published'`,
    )
    console.log(`\nStep 1: Set ${nulled} published stories with 'surprising' emotion to null`)
  }

  // Step 2: Fetch a fallback issue slug for the prompt
  const firstIssue = await prisma.issue.findFirst({ select: { slug: true } })
  const fallbackSlug = firstIssue?.slug ?? 'unknown'

  let cursor: string | undefined
  let processed = 0
  let failed = 0
  let skipped = 0

  while (true) {
    const stories = await prisma.story.findMany({
      where: {
        status: 'published',
        ...(!OVERRIDE_MODE && { emotionTag: null }),
      },
      select: {
        id: true,
        sourceTitle: true,
        sourceContent: true,
      },
      take: TEST_MODE ? BATCH_SIZE : BATCH_SIZE * CONCURRENCY,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
    })

    if (stories.length === 0) break

    // Split into batches for LLM
    const batches: (typeof stories)[] = []
    for (let i = 0; i < stories.length; i += BATCH_SIZE) {
      batches.push(stories.slice(i, i + BATCH_SIZE))
    }

    const results = await Promise.allSettled(
      batches.map((batch) =>
        semaphore.run(async () => {
          const prompt = buildPrompt(batch, fallbackSlug)
          const response = await structuredLlm.invoke([new HumanMessage(prompt)])

          const storyMap = new Map(batch.map((s) => [s.id, s]))

          for (const item of response.articles) {
            const story = storyMap.get(item.articleId)
            if (!story) {
              console.warn(`  LLM returned unknown articleId: ${item.articleId}`)
              skipped++
              continue
            }

            const parsed = emotionTagSchema.safeParse(item.emotionTag)
            if (!parsed.success) {
              console.warn(`  Invalid emotionTag "${item.emotionTag}" for ${story.sourceTitle.slice(0, 50)}`)
              skipped++
              continue
            }

            console.log(`  [${parsed.data.padEnd(12)}] ${story.sourceTitle.slice(0, 70)}`)

            if (!TEST_MODE) {
              await prisma.story.update({
                where: { id: story.id },
                data: { emotionTag: parsed.data as EmotionTag },
              })
            }

            processed++
          }

          // Track stories the LLM didn't return
          const returnedIds = new Set(response.articles.map((a) => a.articleId))
          for (const story of batch) {
            if (!returnedIds.has(story.id)) {
              console.warn(`  LLM did not return result for: ${story.sourceTitle.slice(0, 50)}`)
              skipped++
            }
          }
        }),
      ),
    )

    for (const result of results) {
      if (result.status === 'rejected') {
        failed++
        console.error('Batch failed:', result.reason)
      }
    }

    cursor = stories[stories.length - 1].id

    if (TEST_MODE) break
  }

  console.log(`\nDone. Processed: ${processed}, Failed: ${failed}, Skipped: ${skipped}`)
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
