import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetStoryIdsByStatus = vi.hoisted(() => vi.fn())
const mockAssessStories = vi.hoisted(() => vi.fn())
const mockPrisma = vi.hoisted(() => ({
  issue: { findMany: vi.fn() },
}))

vi.mock('../services/story.js', () => ({
  getStoryIdsByStatus: mockGetStoryIdsByStatus,
}))
vi.mock('../services/analysis.js', () => ({
  assessStories: mockAssessStories,
}))
vi.mock('../lib/prisma.js', () => ({ default: mockPrisma }))

const { runAssessStories } = await import('./assessStories.js')

describe('runAssessStories', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.issue.findMany.mockResolvedValue([])
  })

  it('assesses pre-analyzed stories above threshold', async () => {
    mockPrisma.issue.findMany.mockResolvedValue([
      { id: 'issue-1', name: 'Test Issue', minPreRating: null },
    ])
    mockGetStoryIdsByStatus
      .mockResolvedValueOnce(['story-1', 'story-2']) // issue-1 stories
      .mockResolvedValueOnce([]) // unassigned stories
    mockAssessStories.mockResolvedValue({ completed: 2, errors: 0 })

    await runAssessStories()

    expect(mockGetStoryIdsByStatus).toHaveBeenCalledWith('pre_analyzed', { ratingMin: 5, issueId: 'issue-1' })
    expect(mockGetStoryIdsByStatus).toHaveBeenCalledWith('pre_analyzed', { ratingMin: 5, issueId: null })
    expect(mockAssessStories).toHaveBeenCalledWith(['story-1', 'story-2'])
  })

  it('uses per-issue minPreRating when set', async () => {
    mockPrisma.issue.findMany.mockResolvedValue([
      { id: 'issue-1', name: 'Regular', minPreRating: null },
      { id: 'issue-2', name: 'Strict', minPreRating: 7 },
    ])
    mockGetStoryIdsByStatus
      .mockResolvedValueOnce(['story-1']) // issue-1 with global threshold
      .mockResolvedValueOnce(['story-2']) // issue-2 with threshold 7
      .mockResolvedValueOnce([]) // unassigned
    mockAssessStories.mockResolvedValue({ completed: 2, errors: 0 })

    await runAssessStories()

    expect(mockGetStoryIdsByStatus).toHaveBeenCalledWith('pre_analyzed', { ratingMin: 5, issueId: 'issue-1' })
    expect(mockGetStoryIdsByStatus).toHaveBeenCalledWith('pre_analyzed', { ratingMin: 7, issueId: 'issue-2' })
    expect(mockAssessStories).toHaveBeenCalledWith(['story-1', 'story-2'])
  })

  it('does nothing when no stories above threshold', async () => {
    mockGetStoryIdsByStatus.mockResolvedValue([])

    await runAssessStories()

    expect(mockAssessStories).not.toHaveBeenCalled()
  })

  it('handles errors in assessment result', async () => {
    mockPrisma.issue.findMany.mockResolvedValue([
      { id: 'issue-1', name: 'Test', minPreRating: null },
    ])
    mockGetStoryIdsByStatus
      .mockResolvedValueOnce(['story-1', 'story-2'])
      .mockResolvedValueOnce([])
    mockAssessStories.mockResolvedValue({ completed: 1, errors: 1 })

    await runAssessStories()

    expect(mockAssessStories).toHaveBeenCalledWith(['story-1', 'story-2'])
  })
})
