import crypto from 'node:crypto'
import OpenAI from 'openai'
import prisma from '../lib/prisma.js'
import { withRetry } from '../lib/retry.js'
import { createLogger } from '../lib/logger.js'
import { config } from '../config.js'

const log = createLogger('embedding')

const openai = new OpenAI()

export interface StoryForEmbedding {
  id: string
  title: string | null
  titleLabel: string | null
  summary: string | null
  embeddingContentHash: string | null
}

export function buildEmbeddingContent(story: StoryForEmbedding): string {
  const parts: string[] = []

  if (story.titleLabel && story.title) {
    parts.push(`${story.titleLabel}: ${story.title}`)
  } else if (story.title) {
    parts.push(story.title)
  }

  if (story.summary) {
    parts.push(story.summary)
  }

  return parts.join('\n')
}

export function computeContentHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex')
}

export function needsEmbeddingUpdate(
  story: Pick<StoryForEmbedding, 'embeddingContentHash'>,
  currentHash: string,
): boolean {
  return story.embeddingContentHash !== currentHash
}

// ~8k token limit for text-embedding-3-small; truncate at char level with safety margin
const MAX_EMBEDDING_CHARS = 30_000

export async function generateEmbedding(text: string): Promise<number[]> {
  const input = text.length > MAX_EMBEDDING_CHARS ? text.slice(0, MAX_EMBEDDING_CHARS) : text
  const response = await withRetry(
    () =>
      openai.embeddings.create({
        model: config.embedding.model,
        input,
        dimensions: config.embedding.dimensions,
      }),
    { retries: 3, baseDelayMs: 1000 },
  )
  return response.data[0].embedding
}

export async function generateEmbeddingsBatch(
  texts: string[],
): Promise<number[][]> {
  const response = await withRetry(
    () =>
      openai.embeddings.create({
        model: config.embedding.model,
        input: texts,
        dimensions: config.embedding.dimensions,
      }),
    { retries: 3, baseDelayMs: 1000 },
  )
  // OpenAI returns embeddings in order of input, but sort by index to be safe
  return response.data.sort((a, b) => a.index - b.index).map((d) => d.embedding)
}

interface StoryRow {
  id: string
  status: string
  title: string | null
  title_label: string | null
  summary: string | null
  embedding_content_hash: string | null
}

function rowToStory(row: StoryRow): StoryForEmbedding {
  return {
    id: row.id,
    title: row.title,
    titleLabel: row.title_label,
    summary: row.summary,
    embeddingContentHash: row.embedding_content_hash,
  }
}

async function fetchStoryForEmbedding(storyId: string): Promise<(StoryForEmbedding & { status: string }) | null> {
  const rows = await prisma.$queryRaw<StoryRow[]>`
    SELECT s.id, s.status, s.title, s.title_label, s.summary,
           s.embedding_content_hash
    FROM stories s
    WHERE s.id = ${storyId}
  `
  if (rows.length === 0) return null
  return { ...rowToStory(rows[0]), status: rows[0].status }
}

async function fetchStoriesForEmbedding(storyIds: string[]): Promise<StoryForEmbedding[]> {
  const rows = await prisma.$queryRaw<StoryRow[]>`
    SELECT s.id, s.status, s.title, s.title_label, s.summary,
           s.embedding_content_hash
    FROM stories s
    WHERE s.id = ANY(${storyIds}) AND s.status = 'published'
  `
  return rows.map(rowToStory)
}

export async function updateStoryEmbedding(storyId: string): Promise<boolean> {
  const story = await fetchStoryForEmbedding(storyId)

  if (!story || story.status !== 'published') return false

  const content = buildEmbeddingContent(story)
  const hash = computeContentHash(content)

  if (!needsEmbeddingUpdate(story, hash)) return false

  const embedding = await generateEmbedding(content)

  await prisma.$executeRaw`
    UPDATE stories
    SET embedding = ${JSON.stringify(embedding)}::vector,
        embedding_content_hash = ${hash},
        embedding_generated_at = NOW()
    WHERE id = ${storyId}
  `

  log.info({ storyId, hash }, 'updated story embedding')
  return true
}

export async function updateStoryEmbeddingIfNeeded(
  storyId: string,
): Promise<boolean> {
  try {
    return await updateStoryEmbedding(storyId)
  } catch (err) {
    log.error({ err, storyId }, 'failed to update story embedding')
    return false
  }
}

export interface BatchResult {
  processed: number
  skipped: number
  failed: number
}

export async function batchUpdateEmbeddings(
  storyIds: string[],
): Promise<BatchResult> {
  const result: BatchResult = { processed: 0, skipped: 0, failed: 0 }
  if (storyIds.length === 0) return result

  const stories = await fetchStoriesForEmbedding(storyIds)

  // Build content and check hashes
  const toProcess: { story: StoryForEmbedding; content: string; hash: string }[] = []
  for (const story of stories) {
    const content = buildEmbeddingContent(story)
    const hash = computeContentHash(content)
    if (needsEmbeddingUpdate(story, hash)) {
      toProcess.push({ story, content, hash })
    } else {
      result.skipped++
    }
  }

  // Process in batches for API efficiency
  const batchSize = config.embedding.batchSize
  for (let i = 0; i < toProcess.length; i += batchSize) {
    const batch = toProcess.slice(i, i + batchSize)
    try {
      const embeddings = await generateEmbeddingsBatch(batch.map((b) => b.content))

      for (let j = 0; j < batch.length; j++) {
        const { story, hash } = batch[j]
        const embedding = embeddings[j]
        try {
          await prisma.$executeRaw`
            UPDATE stories
            SET embedding = ${JSON.stringify(embedding)}::vector,
                embedding_content_hash = ${hash},
                embedding_generated_at = NOW()
            WHERE id = ${story.id}
          `
          result.processed++
        } catch (err) {
          log.error({ err, storyId: story.id }, 'failed to save embedding')
          result.failed++
        }
      }
    } catch (err) {
      log.error({ err, batchStart: i, batchSize: batch.length }, 'failed to generate embeddings batch')
      result.failed += batch.length
    }

    // Rate limit delay between batches
    if (i + batchSize < toProcess.length) {
      await new Promise((resolve) => setTimeout(resolve, config.embedding.delayMs))
    }
  }

  return result
}
