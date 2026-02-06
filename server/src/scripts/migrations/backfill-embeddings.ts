/**
 * Backfill embeddings for published stories.
 *
 * Usage:
 *   npm run migration:backfill-embeddings --prefix server              # batch mode (updates DB)
 *   npm run migration:backfill-embeddings:test --prefix server         # test mode (first 3, no writes)
 *   npm run migration:backfill-embeddings --prefix server -- --override  # override mode (re-generates all)
 */

import { Prisma, PrismaClient } from '@prisma/client'
import { Semaphore } from '../../lib/semaphore.js'
import { config } from '../../config.js'
import {
  buildEmbeddingContent,
  computeContentHash,
  needsEmbeddingUpdate,
  generateEmbeddingsBatch,
} from '../../services/embedding.js'

const TEST_MODE = process.argv.includes('--test')
const OVERRIDE_MODE = process.argv.includes('--override')
const CONCURRENCY = config.embedding.concurrency
const BATCH_SIZE = config.embedding.batchSize

const prisma = new PrismaClient()
const semaphore = new Semaphore(CONCURRENCY)

interface StoryRow {
  id: string
  title: string | null
  summary: string | null
  relevance_summary: string | null
  embedding_content_hash: string | null
  issue_name: string | null
  feed_issue_name: string
}

async function fetchBatch(cursor: string | undefined, limit: number): Promise<StoryRow[]> {
  const hashFilter = OVERRIDE_MODE
    ? Prisma.empty
    : Prisma.sql`AND s.embedding_content_hash IS NULL`
  const cursorFilter = cursor
    ? Prisma.sql`AND s.id > ${cursor}`
    : Prisma.empty
  return prisma.$queryRaw<StoryRow[]>`
    SELECT s.id, s.title, s.summary, s.relevance_summary, s.embedding_content_hash,
           i.name as issue_name, fi.name as feed_issue_name
    FROM stories s
    LEFT JOIN issues i ON i.id = s.issue_id
    JOIN feeds f ON f.id = s.feed_id
    JOIN issues fi ON fi.id = f.issue_id
    WHERE s.status = 'published'
    ${hashFilter}
    ${cursorFilter}
    ORDER BY s.id ASC
    LIMIT ${limit}
  `
}

function toEmbeddingInput(row: StoryRow) {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    relevanceSummary: row.relevance_summary,
    embeddingContentHash: row.embedding_content_hash,
    issue: row.issue_name ? { name: row.issue_name } : null,
    feed: { issue: { name: row.feed_issue_name } },
  }
}

async function main() {
  const mode = TEST_MODE ? 'TEST (no DB writes)' : OVERRIDE_MODE ? 'OVERRIDE' : 'BATCH'
  console.log(`Mode: ${mode}`)
  console.log(`Concurrency: ${CONCURRENCY}`)
  console.log(`Batch size: ${BATCH_SIZE}`)
  console.log(`Model: ${config.embedding.model}`)

  let cursor: string | undefined
  let processed = 0
  let skipped = 0
  let failed = 0

  while (true) {
    const rows = await fetchBatch(cursor, TEST_MODE ? 3 : BATCH_SIZE)

    if (rows.length === 0) break

    // Filter to only stories that actually need embedding updates
    const toProcess: { story: ReturnType<typeof toEmbeddingInput>; content: string; hash: string }[] = []
    for (const row of rows) {
      const story = toEmbeddingInput(row)
      const content = buildEmbeddingContent(story)
      const hash = computeContentHash(content)
      if (OVERRIDE_MODE || needsEmbeddingUpdate(story, hash)) {
        toProcess.push({ story, content, hash })
      } else {
        skipped++
      }
    }

    if (toProcess.length > 0) {
      // Process in API batch chunks, with semaphore controlling concurrent batches
      const apiChunkSize = BATCH_SIZE
      for (let i = 0; i < toProcess.length; i += apiChunkSize) {
        const chunk = toProcess.slice(i, i + apiChunkSize)

        await semaphore.run(async () => {
          try {
            const embeddings = await generateEmbeddingsBatch(chunk.map((c) => c.content))

            for (let j = 0; j < chunk.length; j++) {
              const { story, hash } = chunk[j]
              const embedding = embeddings[j]

              console.log(`\n  [${(story.title || 'untitled').slice(0, 60)}]`)
              console.log(`  Hash: ${hash.slice(0, 12)}...`)

              if (!TEST_MODE) {
                try {
                  await prisma.$executeRaw`
                    UPDATE stories
                    SET embedding = ${JSON.stringify(embedding)}::vector,
                        embedding_content_hash = ${hash},
                        embedding_generated_at = NOW()
                    WHERE id = ${story.id}
                  `
                  processed++
                } catch (err) {
                  console.error(`  Failed to save embedding for ${story.id}:`, err)
                  failed++
                }
              } else {
                processed++
              }
            }
          } catch (err) {
            console.error(`  Failed to generate embeddings batch:`, err)
            failed += chunk.length
          }
        })

        // Rate limit delay between API calls
        if (i + apiChunkSize < toProcess.length) {
          await new Promise((resolve) => setTimeout(resolve, config.embedding.delayMs))
        }
      }
    }

    cursor = rows[rows.length - 1].id

    console.log(`\n  Progress: processed=${processed} skipped=${skipped} failed=${failed}`)

    if (TEST_MODE) break
  }

  console.log(`\nDone. Processed: ${processed}, Skipped: ${skipped}, Failed: ${failed}`)
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
