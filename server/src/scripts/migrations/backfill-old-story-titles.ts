/**
 * Rewrite titles and title labels for stories published more than 3 months ago.
 * Old news should use past tense — "logró", "aprobó", "firmó" — not present/future.
 *
 * Usage:
 *   npm run migration:backfill-old-story-titles --prefix server          # batch mode
 *   npm run migration:backfill-old-story-titles:test --prefix server     # test mode (first 5, no writes)
 */

import { PrismaClient } from '@prisma/client'
import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage } from '@langchain/core/messages'
import { z } from 'zod'
import { Semaphore } from '../../lib/semaphore.js'
import { config } from '../../config.js'

const TEST_MODE = process.argv.includes('--test')
const CONCURRENCY = 8
const BATCH_SIZE = 100

// Source articles published before this date are considered "old"
const THREE_MONTHS_AGO = new Date(Date.now() - 3 * 30 * 24 * 60 * 60 * 1000)

const prisma = new PrismaClient()
const llm = new ChatOpenAI({
  model: config.llm.models.medium.name,
  reasoning: { effort: config.llm.models.medium.reasoningEffort },
  maxRetries: 3,
})

const rewriteSchema = z.object({
  titleLabel: z.string().describe('Ultra-short topic label (1-3 words, lowercase except proper nouns)'),
  title: z.string().describe('Standalone headline in PAST TENSE (max 10 words)'),
})

const structuredLlm = llm.withStructuredOutput(rewriteSchema)
const semaphore = new Semaphore(CONCURRENCY)

async function rewriteTitle(story: {
  id: string
  title: string | null
  titleLabel: string | null
  sourceDatePublished: Date | null
}): Promise<{ id: string; titleLabel: string; title: string }> {
  const ageMonths = story.sourceDatePublished
    ? Math.floor((Date.now() - story.sourceDatePublished.getTime()) / (1000 * 60 * 60 * 24 * 30))
    : 0
  const publishedDate = story.sourceDatePublished?.toISOString().slice(0, 10) ?? 'unknown'

  const result = await structuredLlm.invoke([
    new HumanMessage(
      `Esta noticia fue publicada el ${publishedDate} (hace ${ageMonths} meses). Reescribe el título en tiempo PASADO.\n\n` +
        `REGLAS DEL LABEL (etiqueta del título):\n` +
        `- 1-3 palabras cortas. Frase nominal — sin conjunciones, sin "y".\n` +
        `- Minúsculas excepto nombres propios.\n\n` +
        `REGLAS DEL TÍTULO:\n` +
        `- Máximo 10 palabras. Titular independiente.\n` +
        `- Usa tiempo PASADO: "logró", "aprobó", "firmó", "anunció", "rechazó".\n` +
        `- NO uses presente ni futuro: no "logra", no "logrará".\n` +
        `- Concreto: nombra al actor, la acción o lo que está en juego.\n` +
        `- Escrito para un joven de 16 años inteligente — sin jerga.\n` +
        `- El label y el título NO deben compartir palabras.\n\n` +
        `Label actual: "${story.titleLabel ?? ''}"\n` +
        `Título actual: "${story.title ?? ''}"`,
    ),
  ])

  return { id: story.id, titleLabel: result.titleLabel, title: result.title }
}

async function main() {
  console.log(`Mode: ${TEST_MODE ? 'TEST (no DB writes)' : 'BATCH'}`)
  console.log(`Cutoff: stories published before ${THREE_MONTHS_AGO.toISOString().slice(0, 10)}`)
  console.log(`Concurrency: ${CONCURRENCY}`)
  console.log(`Model: ${config.llm.models.medium.name}\n`)

  let cursor: string | undefined
  let processed = 0
  let failed = 0

  while (true) {
    const stories = await prisma.story.findMany({
      where: {
        status: 'published',
        title: { not: null },
        sourceDatePublished: { lt: THREE_MONTHS_AGO },
      },
      select: { id: true, title: true, titleLabel: true, sourceDatePublished: true },
      take: TEST_MODE ? 5 : BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { datePublished: 'asc' },
    })

    if (stories.length === 0) break

    console.log(`Processing batch of ${stories.length}...`)

    const results = await Promise.allSettled(
      stories.map((story) =>
        semaphore.run(async () => {
          const result = await rewriteTitle(story)

          const labelChanged = result.titleLabel !== story.titleLabel
          const titleChanged = result.title !== story.title
          const date = story.sourceDatePublished?.toISOString().slice(0, 10) ?? '?'
          console.log(`\n  [${date}] Original:  "${story.title}"`)
          console.log(`           Label:     "${result.titleLabel}"${labelChanged ? ' ← CHANGED' : ''}`)
          console.log(`           Title:     "${result.title}"${titleChanged ? ' ← CHANGED' : ''}`)

          if (!TEST_MODE) {
            await prisma.story.update({
              where: { id: result.id },
              data: { title: result.title, titleLabel: result.titleLabel },
            })
          }

          processed++
          return result
        }),
      ),
    )

    for (const r of results) {
      if (r.status === 'rejected') {
        failed++
        console.error('Failed:', r.reason)
      }
    }

    cursor = stories[stories.length - 1]?.id
    if (TEST_MODE) break
  }

  console.log(`\nDone. Processed: ${processed}, Failed: ${failed}`)
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
