import crypto from 'node:crypto'
import OpenAI from 'openai'
import { withRetry } from '../lib/retry.js'
import { createLogger } from '../lib/logger.js'
import { config } from '../config.js'
import {
  fetchStoryForEmbedding,
  fetchStoriesForEmbedding,
  saveEmbedding,
  type StoryEmbeddingRow,
} from '../lib/vectors.js'

const log = createLogger('embedding')

const openai = new OpenAI()

export type StoryForEmbedding = StoryEmbeddingRow

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

// Small LRU cache for search query embeddings to avoid redundant OpenAI calls.
// 50 entries * ~6KB each = ~300KB max memory.
const SEARCH_CACHE_MAX = 50
const SEARCH_CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour
const searchEmbeddingCache = new Map<string, { embedding: number[]; expiry: number }>()

function evictExpiredSearchCache() {
  const now = Date.now()
  for (const [key, entry] of searchEmbeddingCache) {
    if (entry.expiry <= now) searchEmbeddingCache.delete(key)
  }
}

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

/**
 * Generate embedding for a search query with caching.
 * Identical queries within the TTL reuse the cached embedding.
 */
export async function generateSearchEmbedding(query: string): Promise<number[]> {
  const key = query.trim().toLowerCase()

  const cached = searchEmbeddingCache.get(key)
  if (cached && cached.expiry > Date.now()) return cached.embedding

  const embedding = await generateEmbedding(query)

  // Evict expired entries and enforce max size
  evictExpiredSearchCache()
  if (searchEmbeddingCache.size >= SEARCH_CACHE_MAX) {
    const oldest = searchEmbeddingCache.keys().next().value!
    searchEmbeddingCache.delete(oldest)
  }

  searchEmbeddingCache.set(key, { embedding, expiry: Date.now() + SEARCH_CACHE_TTL_MS })
  return embedding
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

async function ensureStoryEmbedding(
  storyId: string,
  statusFilter?: string,
): Promise<boolean> {
  const story = await fetchStoryForEmbedding(storyId)

  if (!story) {
    log.debug({ storyId }, 'story not found for embedding')
    return false
  }
  if (statusFilter && story.status !== statusFilter) return false

  const content = buildEmbeddingContent(story)
  if (!content) {
    log.debug({ storyId }, 'no embeddable content (missing title/summary)')
    return false
  }

  const hash = computeContentHash(content)
  if (!needsEmbeddingUpdate(story, hash)) {
    log.debug({ storyId }, 'embedding already up to date')
    return false
  }

  const embedding = await generateEmbedding(content)
  await saveEmbedding(storyId, embedding, hash)

  log.info({ storyId, hash, status: story.status }, 'generated story embedding')
  return true
}

/** Generate/update embedding for a published story. */
export async function updateStoryEmbedding(storyId: string): Promise<boolean> {
  return ensureStoryEmbedding(storyId, 'published')
}

/**
 * Generate embedding for a story regardless of status.
 * Used after assessment for dedup detection (story is in 'analyzed' state).
 */
export async function generateStoryEmbedding(storyId: string): Promise<boolean> {
  return ensureStoryEmbedding(storyId)
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
          await saveEmbedding(story.id, embedding, hash)
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
