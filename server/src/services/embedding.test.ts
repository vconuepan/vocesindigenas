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

const mockLogger = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}))
vi.mock('../lib/logger.js', () => ({
  createLogger: () => mockLogger,
}))

const mockFetchStoryForEmbedding = vi.hoisted(() => vi.fn())
const mockFetchStoriesForEmbedding = vi.hoisted(() => vi.fn())
const mockSaveEmbedding = vi.hoisted(() => vi.fn())
vi.mock('../lib/vectors.js', () => ({
  fetchStoryForEmbedding: mockFetchStoryForEmbedding,
  fetchStoriesForEmbedding: mockFetchStoriesForEmbedding,
  saveEmbedding: mockSaveEmbedding,
}))

const {
  buildEmbeddingContent,
  computeContentHash,
  needsEmbeddingUpdate,
  generateEmbedding,
  generateEmbeddingsBatch,
  generateEmbeddingForContent,
  ensureEmbedding,
  ensureEmbeddings,
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

describe('generateEmbeddingForContent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns embedding and hash when content has changed', async () => {
    mockCreate.mockResolvedValue({
      data: [{ embedding: [0.1, 0.2], index: 0 }],
    })

    const result = await generateEmbeddingForContent({
      title: 'Test Title',
      titleLabel: 'Topic',
      summary: 'A summary',
      embeddingContentHash: null, // no existing hash = force generation
    })

    expect(result).not.toBeNull()
    expect(result!.embedding).toEqual([0.1, 0.2])
    expect(result!.hash).toHaveLength(64) // SHA-256
    expect(mockCreate).toHaveBeenCalled()
  })

  it('returns null when content has not changed (hash matches)', async () => {
    // Pre-compute the hash for "Topic: Test Title\nA summary"
    const content = 'Topic: Test Title\nA summary'
    const hash = computeContentHash(content)

    const result = await generateEmbeddingForContent({
      title: 'Test Title',
      titleLabel: 'Topic',
      summary: 'A summary',
      embeddingContentHash: hash,
    })

    expect(result).toBeNull()
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('returns null when all content fields are empty', async () => {
    const result = await generateEmbeddingForContent({
      title: null,
      titleLabel: null,
      summary: null,
      embeddingContentHash: null,
    })

    expect(result).toBeNull()
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('throws when OpenAI call fails', async () => {
    mockCreate.mockRejectedValue(new Error('OpenAI API error'))

    await expect(
      generateEmbeddingForContent({
        title: 'Test',
        titleLabel: null,
        summary: 'Summary',
        embeddingContentHash: null,
      }),
    ).rejects.toThrow('OpenAI API error')
  })
})

describe('ensureEmbedding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('generates and saves embedding when missing', async () => {
    mockFetchStoryForEmbedding.mockResolvedValue({
      id: 'story-1', title: 'Test', titleLabel: null, summary: 'Summary',
      embeddingContentHash: null, status: 'selected',
    })
    mockCreate.mockResolvedValue({
      data: [{ embedding: [0.1, 0.2], index: 0 }],
    })
    mockSaveEmbedding.mockResolvedValue(undefined)

    await ensureEmbedding('story-1')

    expect(mockFetchStoryForEmbedding).toHaveBeenCalledWith('story-1')
    expect(mockCreate).toHaveBeenCalled()
    expect(mockSaveEmbedding).toHaveBeenCalledWith('story-1', [0.1, 0.2], expect.any(String))
  })

  it('skips when embedding is already current', async () => {
    const content = 'Test\nSummary'
    const hash = computeContentHash(content)
    mockFetchStoryForEmbedding.mockResolvedValue({
      id: 'story-1', title: 'Test', titleLabel: null, summary: 'Summary',
      embeddingContentHash: hash, status: 'analyzed',
    })

    await ensureEmbedding('story-1')

    expect(mockCreate).not.toHaveBeenCalled()
    expect(mockSaveEmbedding).not.toHaveBeenCalled()
  })

  it('does nothing when story not found', async () => {
    mockFetchStoryForEmbedding.mockResolvedValue(null)

    await ensureEmbedding('nonexistent')

    expect(mockCreate).not.toHaveBeenCalled()
    expect(mockSaveEmbedding).not.toHaveBeenCalled()
  })

  it('does nothing when content is empty', async () => {
    mockFetchStoryForEmbedding.mockResolvedValue({
      id: 'story-1', title: null, titleLabel: null, summary: null,
      embeddingContentHash: null, status: 'selected',
    })

    await ensureEmbedding('story-1')

    expect(mockCreate).not.toHaveBeenCalled()
    expect(mockSaveEmbedding).not.toHaveBeenCalled()
  })

  it('logs warning and does not throw on OpenAI failure', async () => {
    mockFetchStoryForEmbedding.mockResolvedValue({
      id: 'story-1', title: 'Test', titleLabel: null, summary: 'Summary',
      embeddingContentHash: null, status: 'selected',
    })
    mockCreate.mockRejectedValue(new Error('OpenAI API error'))

    await ensureEmbedding('story-1')

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ storyId: 'story-1' }),
      expect.stringContaining('failed to ensure embedding'),
    )
    expect(mockSaveEmbedding).not.toHaveBeenCalled()
  })
})

describe('ensureEmbeddings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('generates and saves embeddings for stories missing them', async () => {
    mockFetchStoriesForEmbedding.mockResolvedValue([
      { id: 'story-1', title: 'Story 1', titleLabel: null, summary: 'Summary 1', embeddingContentHash: null },
    ])
    mockCreate.mockResolvedValue({
      data: [{ embedding: [0.5], index: 0 }],
    })
    mockSaveEmbedding.mockResolvedValue(undefined)

    await ensureEmbeddings(['story-1'])

    expect(mockFetchStoriesForEmbedding).toHaveBeenCalledWith(['story-1'], undefined)
    expect(mockSaveEmbedding).toHaveBeenCalledWith('story-1', [0.5], expect.any(String))
  })

  it('passes no status filter to fetch all stories regardless of status', async () => {
    mockFetchStoriesForEmbedding.mockResolvedValue([])

    await ensureEmbeddings(['story-1'])

    expect(mockFetchStoriesForEmbedding).toHaveBeenCalledWith(['story-1'], undefined)
  })

  it('logs warning when some embeddings fail', async () => {
    mockFetchStoriesForEmbedding.mockResolvedValue([
      { id: 'story-1', title: 'S1', titleLabel: null, summary: 'Sum1', embeddingContentHash: null },
    ])
    mockCreate.mockRejectedValue(new Error('API error'))

    await ensureEmbeddings(['story-1'])

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ failedCount: 1 }),
      expect.stringContaining('failed during ensure'),
    )
  })

  it('does not warn when all succeed', async () => {
    mockFetchStoriesForEmbedding.mockResolvedValue([
      { id: 'story-1', title: 'S1', titleLabel: null, summary: 'Sum1', embeddingContentHash: null },
    ])
    mockCreate.mockResolvedValue({
      data: [{ embedding: [0.1], index: 0 }],
    })
    mockSaveEmbedding.mockResolvedValue(undefined)

    await ensureEmbeddings(['story-1'])

    expect(mockLogger.warn).not.toHaveBeenCalled()
  })

  it('handles empty array', async () => {
    await ensureEmbeddings([])

    expect(mockFetchStoriesForEmbedding).not.toHaveBeenCalled()
  })
})
