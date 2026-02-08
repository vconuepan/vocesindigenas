import { describe, it, expect, vi, beforeEach } from 'vitest'

// ──── Mocks ──────────────────────────────────────────────────────────────────

const mockPrisma = vi.hoisted(() => ({
  story: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    groupBy: vi.fn(),
  },
  storyCluster: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  $queryRaw: vi.fn(),
  $disconnect: vi.fn(),
  $transaction: vi.fn((args: any) => Array.isArray(args) ? Promise.all(args) : args()),
}))

vi.mock('../lib/prisma.js', () => ({ default: mockPrisma }))

const mockInvoke = vi.hoisted(() => vi.fn())
vi.mock('./llm.js', () => ({
  getLLMByTier: () => ({
    withStructuredOutput: () => ({ invoke: mockInvoke }),
  }),
  rateLimitDelay: vi.fn(),
}))

vi.mock('../config.js', () => ({
  config: {
    dedup: { maxCandidates: 10, timeWindowDays: 14, enabled: true, modelTier: 'small' },
  },
}))

vi.mock('../lib/logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  }),
}))

vi.mock('../prompts/dedup.js', () => ({
  buildDedupPrompt: vi.fn(() => 'mocked-prompt'),
}))

vi.mock('../schemas/llm.js', () => ({
  dedupConfirmationSchema: {},
}))

const { confirmDuplicates, updatePrimary, autoRejectNonPrimary } = await import('./dedup.js')

// ──── confirmDuplicates ──────────────────────────────────────────────────────

describe('confirmDuplicates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty array for empty candidates', async () => {
    const result = await confirmDuplicates(
      { title: 'Source Article', summary: 'Summary of source' },
      [],
    )

    expect(result).toEqual([])
    expect(mockInvoke).not.toHaveBeenCalled()
  })

  it('maps LLM response correctly to candidate IDs', async () => {
    const candidates = [
      { id: 'cand-1', title: 'Candidate One', summary: 'Summary one' },
      { id: 'cand-2', title: 'Candidate Two', summary: 'Summary two' },
      { id: 'cand-3', title: 'Candidate Three', summary: 'Summary three' },
    ]

    mockInvoke.mockResolvedValue({
      assessments: [
        { candidateNumber: 1, isDuplicate: true, reason: 'Same event' },
        { candidateNumber: 2, isDuplicate: false, reason: 'Different event' },
        { candidateNumber: 3, isDuplicate: true, reason: 'Same incident' },
      ],
    })

    const result = await confirmDuplicates(
      { title: 'Source Article', summary: 'Summary of source' },
      candidates,
    )

    expect(result).toEqual([
      { id: 'cand-1', isDuplicate: true, reason: 'Same event' },
      { id: 'cand-2', isDuplicate: false, reason: 'Different event' },
      { id: 'cand-3', isDuplicate: true, reason: 'Same incident' },
    ])
  })

  it('handles out-of-range candidateNumber from LLM (warns and filters)', async () => {
    const candidates = [
      { id: 'cand-1', title: 'Candidate One', summary: 'Summary one' },
    ]

    mockInvoke.mockResolvedValue({
      assessments: [
        { candidateNumber: 1, isDuplicate: true, reason: 'Same event' },
        { candidateNumber: 5, isDuplicate: true, reason: 'Out of range' },
        { candidateNumber: 0, isDuplicate: false, reason: 'Zero index' },
      ],
    })

    const result = await confirmDuplicates(
      { title: 'Source Article', summary: 'Summary of source' },
      candidates,
    )

    // Only candidateNumber 1 maps to a valid candidate
    expect(result).toEqual([
      { id: 'cand-1', isDuplicate: true, reason: 'Same event' },
    ])
  })

  it('returns all as non-duplicate when LLM says none match', async () => {
    const candidates = [
      { id: 'cand-1', title: 'Candidate One', summary: 'Summary one' },
      { id: 'cand-2', title: 'Candidate Two', summary: 'Summary two' },
    ]

    mockInvoke.mockResolvedValue({
      assessments: [
        { candidateNumber: 1, isDuplicate: false, reason: 'Different topic' },
        { candidateNumber: 2, isDuplicate: false, reason: 'Unrelated' },
      ],
    })

    const result = await confirmDuplicates(
      { title: 'Source Article', summary: 'Summary of source' },
      candidates,
    )

    expect(result).toHaveLength(2)
    expect(result.every(r => !r.isDuplicate)).toBe(true)
  })
})

// ──── updatePrimary ──────────────────────────────────────────────────────────

describe('updatePrimary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does nothing for empty cluster', async () => {
    mockPrisma.storyCluster.findUnique.mockResolvedValue({
      id: 'cluster-1',
      primaryStoryId: null,
      stories: [],
    })

    await updatePrimary('cluster-1')

    expect(mockPrisma.storyCluster.update).not.toHaveBeenCalled()
  })

  it('does nothing when cluster is not found', async () => {
    mockPrisma.storyCluster.findUnique.mockResolvedValue(null)

    await updatePrimary('nonexistent-cluster')

    expect(mockPrisma.storyCluster.update).not.toHaveBeenCalled()
  })

  it('picks published story over unpublished', async () => {
    mockPrisma.storyCluster.findUnique.mockResolvedValue({
      id: 'cluster-1',
      primaryStoryId: null,
      stories: [
        { id: 'story-unpublished', status: 'analyzed', relevance: 9, dateCrawled: new Date('2024-01-01'), datePublished: null },
        { id: 'story-published', status: 'published', relevance: 5, dateCrawled: new Date('2024-01-03'), datePublished: new Date('2024-01-04') },
      ],
    })

    await updatePrimary('cluster-1')

    expect(mockPrisma.storyCluster.update).toHaveBeenCalledWith({
      where: { id: 'cluster-1' },
      data: { primaryStoryId: 'story-published' },
    })
  })

  it('picks highest relevance when none published', async () => {
    mockPrisma.storyCluster.findUnique.mockResolvedValue({
      id: 'cluster-1',
      primaryStoryId: null,
      stories: [
        { id: 'story-low', status: 'analyzed', relevance: 3, dateCrawled: new Date('2024-01-01'), datePublished: null },
        { id: 'story-high', status: 'analyzed', relevance: 8, dateCrawled: new Date('2024-01-02'), datePublished: null },
        { id: 'story-mid', status: 'selected', relevance: 5, dateCrawled: new Date('2024-01-03'), datePublished: null },
      ],
    })

    await updatePrimary('cluster-1')

    expect(mockPrisma.storyCluster.update).toHaveBeenCalledWith({
      where: { id: 'cluster-1' },
      data: { primaryStoryId: 'story-high' },
    })
  })

  it('picks earliest crawled as tiebreaker when relevance is equal', async () => {
    mockPrisma.storyCluster.findUnique.mockResolvedValue({
      id: 'cluster-1',
      primaryStoryId: null,
      stories: [
        { id: 'story-later', status: 'analyzed', relevance: 7, dateCrawled: new Date('2024-01-05'), datePublished: null },
        { id: 'story-earlier', status: 'analyzed', relevance: 7, dateCrawled: new Date('2024-01-01'), datePublished: null },
      ],
    })

    await updatePrimary('cluster-1')

    expect(mockPrisma.storyCluster.update).toHaveBeenCalledWith({
      where: { id: 'cluster-1' },
      data: { primaryStoryId: 'story-earlier' },
    })
  })

  it('does not update if primary has not changed', async () => {
    mockPrisma.storyCluster.findUnique.mockResolvedValue({
      id: 'cluster-1',
      primaryStoryId: 'story-published',
      stories: [
        { id: 'story-published', status: 'published', relevance: 5, dateCrawled: new Date('2024-01-01'), datePublished: new Date('2024-01-02') },
        { id: 'story-other', status: 'analyzed', relevance: 9, dateCrawled: new Date('2024-01-01'), datePublished: null },
      ],
    })

    await updatePrimary('cluster-1')

    expect(mockPrisma.storyCluster.update).not.toHaveBeenCalled()
  })

  it('picks earliest published when multiple stories are published', async () => {
    mockPrisma.storyCluster.findUnique.mockResolvedValue({
      id: 'cluster-1',
      primaryStoryId: null,
      stories: [
        { id: 'story-pub-late', status: 'published', relevance: 8, dateCrawled: new Date('2024-01-01'), datePublished: new Date('2024-01-10') },
        { id: 'story-pub-early', status: 'published', relevance: 5, dateCrawled: new Date('2024-01-03'), datePublished: new Date('2024-01-05') },
      ],
    })

    await updatePrimary('cluster-1')

    expect(mockPrisma.storyCluster.update).toHaveBeenCalledWith({
      where: { id: 'cluster-1' },
      data: { primaryStoryId: 'story-pub-early' },
    })
  })

  it('handles null relevance values by treating them as 0', async () => {
    mockPrisma.storyCluster.findUnique.mockResolvedValue({
      id: 'cluster-1',
      primaryStoryId: null,
      stories: [
        { id: 'story-null', status: 'analyzed', relevance: null, dateCrawled: new Date('2024-01-01'), datePublished: null },
        { id: 'story-rated', status: 'analyzed', relevance: 3, dateCrawled: new Date('2024-01-02'), datePublished: null },
      ],
    })

    await updatePrimary('cluster-1')

    expect(mockPrisma.storyCluster.update).toHaveBeenCalledWith({
      where: { id: 'cluster-1' },
      data: { primaryStoryId: 'story-rated' },
    })
  })
})

// ──── autoRejectNonPrimary ───────────────────────────────────────────────────

describe('autoRejectNonPrimary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects non-primary, non-published members', async () => {
    mockPrisma.storyCluster.findUnique.mockResolvedValue({
      id: 'cluster-1',
      primaryStoryId: 'story-primary',
      primaryStory: { id: 'story-primary', title: 'Primary Story' },
      stories: [
        { id: 'story-primary', status: 'selected' },
        { id: 'story-dup-1', status: 'analyzed' },
        { id: 'story-dup-2', status: 'selected' },
      ],
    })
    mockPrisma.story.updateMany.mockResolvedValue({ count: 2 })

    const result = await autoRejectNonPrimary('cluster-1')

    expect(result).toEqual(['story-dup-1', 'story-dup-2'])
    expect(mockPrisma.story.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['story-dup-1', 'story-dup-2'] } },
      data: { status: 'rejected' },
    })
  })

  it('does not reject published stories', async () => {
    mockPrisma.storyCluster.findUnique.mockResolvedValue({
      id: 'cluster-1',
      primaryStoryId: 'story-primary',
      primaryStory: { id: 'story-primary', title: 'Primary Story' },
      stories: [
        { id: 'story-primary', status: 'published' },
        { id: 'story-also-published', status: 'published' },
        { id: 'story-analyzed', status: 'analyzed' },
      ],
    })
    mockPrisma.story.updateMany.mockResolvedValue({ count: 1 })

    const result = await autoRejectNonPrimary('cluster-1')

    // Only story-analyzed should be rejected; story-also-published is protected
    expect(result).toEqual(['story-analyzed'])
    expect(mockPrisma.story.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['story-analyzed'] } },
      data: { status: 'rejected' },
    })
  })

  it('does not reject already-rejected stories', async () => {
    mockPrisma.storyCluster.findUnique.mockResolvedValue({
      id: 'cluster-1',
      primaryStoryId: 'story-primary',
      primaryStory: { id: 'story-primary', title: 'Primary Story' },
      stories: [
        { id: 'story-primary', status: 'selected' },
        { id: 'story-already-rejected', status: 'rejected' },
        { id: 'story-trashed', status: 'trashed' },
        { id: 'story-eligible', status: 'analyzed' },
      ],
    })
    mockPrisma.story.updateMany.mockResolvedValue({ count: 1 })

    const result = await autoRejectNonPrimary('cluster-1')

    // Only story-eligible should be rejected; rejected and trashed are skipped
    expect(result).toEqual(['story-eligible'])
    expect(mockPrisma.story.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['story-eligible'] } },
      data: { status: 'rejected' },
    })
  })

  it('returns empty when no primary is set', async () => {
    mockPrisma.storyCluster.findUnique.mockResolvedValue({
      id: 'cluster-1',
      primaryStoryId: null,
      primaryStory: null,
      stories: [
        { id: 'story-1', status: 'analyzed' },
        { id: 'story-2', status: 'analyzed' },
      ],
    })

    const result = await autoRejectNonPrimary('cluster-1')

    expect(result).toEqual([])
    expect(mockPrisma.story.updateMany).not.toHaveBeenCalled()
  })

  it('returns empty when nothing to reject', async () => {
    mockPrisma.storyCluster.findUnique.mockResolvedValue({
      id: 'cluster-1',
      primaryStoryId: 'story-primary',
      primaryStory: { id: 'story-primary', title: 'Primary Story' },
      stories: [
        { id: 'story-primary', status: 'published' },
      ],
    })

    const result = await autoRejectNonPrimary('cluster-1')

    expect(result).toEqual([])
    expect(mockPrisma.story.updateMany).not.toHaveBeenCalled()
  })

  it('returns empty when cluster is not found', async () => {
    mockPrisma.storyCluster.findUnique.mockResolvedValue(null)

    const result = await autoRejectNonPrimary('nonexistent-cluster')

    expect(result).toEqual([])
    expect(mockPrisma.story.updateMany).not.toHaveBeenCalled()
  })

  it('returns empty when all non-primary members are already rejected or trashed', async () => {
    mockPrisma.storyCluster.findUnique.mockResolvedValue({
      id: 'cluster-1',
      primaryStoryId: 'story-primary',
      primaryStory: { id: 'story-primary', title: 'Primary Story' },
      stories: [
        { id: 'story-primary', status: 'selected' },
        { id: 'story-rej-1', status: 'rejected' },
        { id: 'story-rej-2', status: 'trashed' },
      ],
    })

    const result = await autoRejectNonPrimary('cluster-1')

    expect(result).toEqual([])
    expect(mockPrisma.story.updateMany).not.toHaveBeenCalled()
  })
})
