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
  model: config.llm.models.medium.name,
  reasoning: { effort: config.llm.models.medium.reasoningEffort },
  maxRetries: 3,
})
const structuredLlm = llm.withStructuredOutput(extractTitleLabelSchema)
const semaphore = new Semaphore(CONCURRENCY)

async function processSingle(story: {
  id: string
  title: string
  summary: string | null
}): Promise<{
  id: string
  originalTitle: string
  titleLabel: string
  title: string
}> {
  const summaryLine = story.summary ? `\nSummary: "${story.summary}"\n` : ''
  const result = await structuredLlm.invoke([
    new HumanMessage(
      `Rewrite this news headline into an ultra-short topic label and a standalone headline.\n` +
        `The label and title work as a pair: the label sets the topic, the title tells the story. Together they read like one thought.\n` +
        `No word or phrase should appear in both the label and the title.\n\n` +
        `LABEL RULES:\n` +
        `- 1-3 short words, sentence case. A tight noun phrase — no conjunctions, no "and".\n` +
        `- Good: "EU AI Act", "Carbon inequality", "Deepfake laws", "Nuclear risk", "Ocean health"\n` +
        `- Bad: "Non-consensual deepfake nudification" (too complex — just "Deepfake laws")\n` +
        `- Bad: "Major shift in global politics" (sounds like a headline, not a label)\n\n` +
        `TITLE RULES:\n` +
        `- A standalone headline. Max 10 words — if you hit 10, cut something.\n` +
        `- Write for a smart 16-year-old, not an expert. Avoid jargon and insider terms unless they're household names.\n` +
        `- The headline must make sense on its own — a reader with no background should grasp the basic story.\n` +
        `- One story per headline. If there are two developments, lead with the bigger one.\n` +
        `- Don't echo the label — use that word budget to say something new.\n` +
        `- Be concrete: name the actor, the action, or the stakes. A number often beats an adjective.\n` +
        `- Replace noun stacks with plain words ("whistleblower channel" → "hotline"; "timeline changes" → "delays").\n` +
        `- Cut hedge words: "could shape," "may impact" → say what's actually happening or proposed.\n` +
        `- NEVER use the "Label: headline" colon pattern. The label is a separate field.\n` +
        `- Sentence case: capitalize first word and proper nouns only.\n\n` +
        `EXAMPLES (read label + title together as one unit):\n` +
        `  Input: "EU AI Act: whistleblower channel and proposed timeline changes could shape enforcement"\n` +
        `  Label: "EU AI Act"\n` +
        `  Title: "EU proposes whistleblower hotline to enforce new rules"\n\n` +
        `  Input: "Carbon inequality and climate policy: Oxfam says the richest 1% used a 1.5°C fair share carbon budget within 10 days"\n` +
        `  Label: "Carbon inequality"\n` +
        `  Title: "Richest 1% burn through their fair carbon budget in 10 days"\n\n` +
        `Current title: "${story.title}"` +
        summaryLine,
    ),
  ])
  return { id: story.id, originalTitle: story.title, titleLabel: result.titleLabel, title: result.title }
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
      where: OVERRIDE_MODE
        ? { status: 'published', title: { not: null } }
        : { title: { not: null, contains: ':' } },
      select: { id: true, title: true, titleLabel: true, summary: true },
      take: TEST_MODE ? 3 : BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
    })

    if (stories.length === 0) break

    const results = await Promise.allSettled(
      stories.map((story) =>
        semaphore.run(async () => {
          const result = await processSingle(
            story as { id: string; title: string; summary: string | null },
          )

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
