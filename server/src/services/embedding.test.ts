import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('openai', () => {
  const mockCreate = vi.fn()
  return {
    default: class OpenAI {
      embeddings = { create: mockCreate }
    },
    __mockCreate: mockCreate,
  }
})

vi.mock('../lib/prisma.js', () => ({
  default: {
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
  },
}))

vi.mock('../lib/retry.js', () => ({
  withRetry: (fn: () => Promise<unknown>) => fn(),
}))

vi.mock('../lib/logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

const {
  buildEmbeddingContent,
  computeContentHash,
  needsEmbeddingUpdate,
  generateEmbedding,
  generateEmbeddingsBatch,
} = await import('./embedding.js')

// Access the mock through the module
const openaiModule = await import('openai')
const mockCreate = (openaiModule as any).__mockCreate as ReturnType<typeof vi.fn>

describe('buildEmbeddingContent', () => {
  it('builds content with all fields present', () => {
    const story = {
      id: '1',
      title: 'AI Breakthrough',
      titleLabel: 'Technology',
      summary: 'Researchers achieve major milestone',
      embeddingContentHash: null,
    }

    const content = buildEmbeddingContent(story)
    expect(content).toBe(
      'Technology: AI Breakthrough\nResearchers achieve major milestone',
    )
  })

  it('uses title alone when titleLabel is null', () => {
    const story = {
      id: '1',
      title: 'Climate Report',
      titleLabel: null,
      summary: 'New data published',
      embeddingContentHash: null,
    }

    const content = buildEmbeddingContent(story)
    expect(content).toBe('Climate Report\nNew data published')
  })

  it('handles missing title gracefully', () => {
    const story = {
      id: '1',
      title: null,
      titleLabel: 'Health',
      summary: 'Some summary',
      embeddingContentHash: null,
    }

    const content = buildEmbeddingContent(story)
    expect(content).toBe('Some summary')
  })

  it('handles missing summary', () => {
    const story = {
      id: '1',
      title: 'Just a Title',
      titleLabel: 'Science',
      summary: null,
      embeddingContentHash: null,
    }

    const content = buildEmbeddingContent(story)
    expect(content).toBe('Science: Just a Title')
  })

  it('handles all fields null', () => {
    const story = {
      id: '1',
      title: null,
      titleLabel: null,
      summary: null,
      embeddingContentHash: null,
    }

    const content = buildEmbeddingContent(story)
    expect(content).toBe('')
  })
})

describe('computeContentHash', () => {
  it('produces deterministic hex hash', () => {
    const hash1 = computeContentHash('hello world')
    const hash2 = computeContentHash('hello world')
    expect(hash1).toBe(hash2)
    expect(hash1).toHaveLength(64) // SHA-256 hex
  })

  it('produces different hashes for different content', () => {
    const hash1 = computeContentHash('content A')
    const hash2 = computeContentHash('content B')
    expect(hash1).not.toBe(hash2)
  })
})

describe('needsEmbeddingUpdate', () => {
  it('returns true when hash is null (no existing embedding)', () => {
    expect(needsEmbeddingUpdate({ embeddingContentHash: null }, 'abc123')).toBe(true)
  })

  it('returns true when hashes differ', () => {
    expect(needsEmbeddingUpdate({ embeddingContentHash: 'old' }, 'new')).toBe(true)
  })

  it('returns false when hashes match', () => {
    expect(needsEmbeddingUpdate({ embeddingContentHash: 'same' }, 'same')).toBe(false)
  })
})

describe('generateEmbedding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns embedding vector from OpenAI', async () => {
    const mockEmbedding = [0.1, 0.2, 0.3]
    mockCreate.mockResolvedValue({
      data: [{ embedding: mockEmbedding, index: 0 }],
    })

    const result = await generateEmbedding('test text')
    expect(result).toEqual(mockEmbedding)
    expect(mockCreate).toHaveBeenCalledWith({
      model: 'text-embedding-3-small',
      input: 'test text',
      dimensions: 1536,
    })
  })
})

describe('generateEmbeddingsBatch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns embeddings in correct order', async () => {
    mockCreate.mockResolvedValue({
      data: [
        { embedding: [0.3], index: 2 },
        { embedding: [0.1], index: 0 },
        { embedding: [0.2], index: 1 },
      ],
    })

    const result = await generateEmbeddingsBatch(['a', 'b', 'c'])
    expect(result).toEqual([[0.1], [0.2], [0.3]])
  })
})
