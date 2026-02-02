import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sampleStory, sampleFeed, sampleIssue } from '../test/helpers.js'

const mockPrisma = vi.hoisted(() => ({
  story: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  issue: {
    findMany: vi.fn(),
  },
  $transaction: vi.fn((args: any) => Array.isArray(args) ? Promise.all(args) : args()),
}))

const mockGetSmallLLM = vi.hoisted(() => vi.fn())
const mockGetMediumLLM = vi.hoisted(() => vi.fn())
const mockGetLargeLLM = vi.hoisted(() => vi.fn())
const mockRateLimitDelay = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))

vi.mock('../lib/prisma.js', () => ({ default: mockPrisma }))
vi.mock('./llm.js', () => ({
  getSmallLLM: mockGetSmallLLM,
  getMediumLLM: mockGetMediumLLM,
  getLargeLLM: mockGetLargeLLM,
  rateLimitDelay: mockRateLimitDelay,
}))

const { preAssessStories, reclassifyStories, assessStory, selectStories } = await import('./analysis.js')

function storyWithRelations(overrides: Record<string, any> = {}) {
  return {
    ...sampleStory(overrides),
    feed: {
      ...sampleFeed(),
      issue: sampleIssue(),
    },
  }
}

describe('preAssessStories', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls medium LLM with structured output, assigns issues, and updates stories', async () => {
    const issue = sampleIssue()
    const story1 = storyWithRelations({ id: 'story-1' })
    const story2 = storyWithRelations({ id: 'story-2' })
    mockPrisma.story.findMany.mockResolvedValue([story1, story2])
    mockPrisma.story.update.mockResolvedValue({})
    mockPrisma.issue.findMany.mockResolvedValue([issue])

    const mockStructuredLlm = {
      invoke: vi.fn().mockResolvedValue({
        articles: [
          { articleId: 'story-1', issueSlug: 'ai-technology', rating: 4, emotionTag: 'surprising' },
          { articleId: 'story-2', issueSlug: 'ai-technology', rating: 2, emotionTag: 'calm' },
        ],
      }),
    }
    mockGetMediumLLM.mockReturnValue({
      withStructuredOutput: () => mockStructuredLlm,
    })

    const results = await preAssessStories(['story-1', 'story-2'])

    expect(mockGetMediumLLM).toHaveBeenCalled()
    expect(results).toHaveLength(2)
    expect(results[0]).toEqual({ storyId: 'story-1', rating: 4, emotionTag: 'surprising' })
    expect(results[1]).toEqual({ storyId: 'story-2', rating: 2, emotionTag: 'calm' })

    expect(mockPrisma.story.update).toHaveBeenCalledWith({
      where: { id: 'story-1' },
      data: { issueId: issue.id, relevancePre: 4, emotionTag: 'surprising', status: 'pre_analyzed' },
    })
    expect(mockPrisma.story.update).toHaveBeenCalledWith({
      where: { id: 'story-2' },
      data: { issueId: issue.id, relevancePre: 2, emotionTag: 'calm', status: 'pre_analyzed' },
    })
  })

  it('falls back to feed issueId for invalid slugs', async () => {
    const issues = [
      sampleIssue({ id: 'issue-1', slug: 'ai-technology', name: 'AI', description: 'AI topics' }),
    ]
    mockPrisma.issue.findMany.mockResolvedValue(issues)

    const story = storyWithRelations({ id: 'story-1' })
    mockPrisma.story.findMany.mockResolvedValue([story])
    mockPrisma.story.update.mockResolvedValue({})

    const mockStructuredLlm = {
      invoke: vi.fn().mockResolvedValue({
        articles: [
          { articleId: 'story-1', issueSlug: 'nonexistent-slug', rating: 5, emotionTag: 'calm' },
        ],
      }),
    }
    mockGetMediumLLM.mockReturnValue({
      withStructuredOutput: () => mockStructuredLlm,
    })

    const results = await preAssessStories(['story-1'])

    expect(results).toHaveLength(1)
    // Falls back to feed's issueId
    expect(mockPrisma.story.update).toHaveBeenCalledWith({
      where: { id: 'story-1' },
      data: { issueId: story.feed.issue.id, relevancePre: 5, emotionTag: 'calm', status: 'pre_analyzed' },
    })
  })
})

describe('reclassifyStories', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls small LLM and updates only issueId and emotionTag (not rating or status)', async () => {
    const issue = sampleIssue()
    const story = storyWithRelations({ id: 'story-1', relevancePre: 7, status: 'analyzed' })
    mockPrisma.story.findMany.mockResolvedValue([story])
    mockPrisma.story.update.mockResolvedValue({})
    mockPrisma.issue.findMany.mockResolvedValue([issue])

    const mockStructuredLlm = {
      invoke: vi.fn().mockResolvedValue({
        articles: [
          { articleId: 'story-1', issueSlug: 'ai-technology', emotionTag: 'uplifting' },
        ],
      }),
    }
    mockGetSmallLLM.mockReturnValue({
      withStructuredOutput: () => mockStructuredLlm,
    })

    const results = await reclassifyStories(['story-1'])

    expect(mockGetSmallLLM).toHaveBeenCalled()
    expect(results).toHaveLength(1)
    expect(results[0]).toEqual({ storyId: 'story-1', emotionTag: 'uplifting' })

    // Should update issueId and emotionTag only — no relevancePre, no status
    expect(mockPrisma.story.update).toHaveBeenCalledWith({
      where: { id: 'story-1' },
      data: { issueId: issue.id, emotionTag: 'uplifting' },
    })
  })

  it('falls back to feed issueId for invalid slugs', async () => {
    const issues = [
      sampleIssue({ id: 'issue-1', slug: 'ai-technology', name: 'AI', description: 'AI topics' }),
    ]
    mockPrisma.issue.findMany.mockResolvedValue(issues)

    const story = storyWithRelations({ id: 'story-1' })
    mockPrisma.story.findMany.mockResolvedValue([story])
    mockPrisma.story.update.mockResolvedValue({})

    const mockStructuredLlm = {
      invoke: vi.fn().mockResolvedValue({
        articles: [
          { articleId: 'story-1', issueSlug: 'nonexistent-slug', emotionTag: 'calm' },
        ],
      }),
    }
    mockGetSmallLLM.mockReturnValue({
      withStructuredOutput: () => mockStructuredLlm,
    })

    await reclassifyStories(['story-1'])

    expect(mockPrisma.story.update).toHaveBeenCalledWith({
      where: { id: 'story-1' },
      data: { issueId: story.feed.issue.id, emotionTag: 'calm' },
    })
  })
})

describe('assessStory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls LLM with structured output and updates story fields', async () => {
    const story = storyWithRelations({ id: 'story-1' })
    mockPrisma.story.findUnique.mockResolvedValue(story)
    mockPrisma.story.update.mockResolvedValue({})

    const structuredResponse = {
      publicationDate: '2024-01-15 00:00:00',
      quote: '"Test quote" said Expert',
      quoteAttribution: 'Dr. Smith, University of Oxford',
      summary: 'Test summary with key information.',
      factors: ['Factor one: Detailed explanation.', 'Factor two: Detailed explanation.'],
      limitingFactors: ['Limiting factor: Explanation of limitation.'],
      relevanceCalculation: ['Key factor: 5', 'Limitation: -2'],
      conservativeRating: 3,
      relevanceSummary: 'Test relevance summary explaining the rating.',
      titleLabel: 'Test topic',
      relevanceTitle: 'Test title: subtitle here',
      marketingBlurb: 'Publisher reports on test topic with assessment.',
    }

    const mockStructuredLlm = {
      invoke: vi.fn().mockResolvedValue(structuredResponse),
    }
    mockGetLargeLLM.mockReturnValue({
      withStructuredOutput: () => mockStructuredLlm,
    })

    await assessStory('story-1')

    expect(mockPrisma.story.update).toHaveBeenCalledWith({
      where: { id: 'story-1' },
      data: expect.objectContaining({
        titleLabel: 'Test topic',
        summary: 'Test summary with key information.',
        quote: '"Test quote" said Expert',
        quoteAttribution: 'Dr. Smith, University of Oxford',
        relevanceReasons: 'Factor one: Detailed explanation.\nFactor two: Detailed explanation.',
        antifactors: 'Limiting factor: Explanation of limitation.',
        relevanceCalculation: 'Key factor: 5\nLimitation: -2',
        relevance: 3,
        status: 'analyzed',
      }),
    })
  })

  it('throws when story not found', async () => {
    mockPrisma.story.findUnique.mockResolvedValue(null)
    await expect(assessStory('nonexistent')).rejects.toThrow('Story not found')
  })
})

describe('selectStories', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls LLM and updates selected/rejected statuses', async () => {
    const stories = [
      sampleStory({ id: 'story-1', summary: 'Summary 1', status: 'analyzed' }),
      sampleStory({ id: 'story-2', summary: 'Summary 2', status: 'analyzed' }),
      sampleStory({ id: 'story-3', summary: 'Summary 3', status: 'analyzed' }),
      sampleStory({ id: 'story-4', summary: 'Summary 4', status: 'analyzed' }),
    ]
    mockPrisma.story.findMany.mockResolvedValue(stories)
    mockPrisma.story.updateMany.mockResolvedValue({ count: 2 })

    const mockStructuredLlm = {
      invoke: vi.fn().mockResolvedValue({
        selectedIds: ['story-1', 'story-3'],
      }),
    }
    mockGetLargeLLM.mockReturnValue({
      withStructuredOutput: () => mockStructuredLlm,
    })

    const result = await selectStories(['story-1', 'story-2', 'story-3', 'story-4'])

    expect(result.selected).toEqual(['story-1', 'story-3'])
    expect(result.rejected).toEqual(['story-2', 'story-4'])

    expect(mockPrisma.story.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['story-1', 'story-3'] } },
      data: { status: 'selected' },
    })
    expect(mockPrisma.story.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['story-2', 'story-4'] } },
      data: { status: 'rejected' },
    })
  })

  it('returns empty arrays when no stories found', async () => {
    mockPrisma.story.findMany.mockResolvedValue([])
    const result = await selectStories(['nonexistent'])
    expect(result).toEqual({ selected: [], rejected: [] })
  })
})
