import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetStoryIdsByStatus = vi.hoisted(() => vi.fn())
const mockAssessStories = vi.hoisted(() => vi.fn())

vi.mock('../services/story.js', () => ({
  getStoryIdsByStatus: mockGetStoryIdsByStatus,
}))
vi.mock('../services/analysis.js', () => ({
  assessStories: mockAssessStories,
}))

const { runAssessStories } = await import('./assessStories.js')

describe('runAssessStories', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('assesses pre-analyzed stories above threshold', async () => {
    mockGetStoryIdsByStatus.mockResolvedValue(['story-1', 'story-2'])
    mockAssessStories.mockResolvedValue({ completed: 2, errors: 0 })

    await runAssessStories()

    expect(mockGetStoryIdsByStatus).toHaveBeenCalledWith('pre_analyzed', { ratingMin: 5 })
    expect(mockAssessStories).toHaveBeenCalledWith(['story-1', 'story-2'])
  })

  it('does nothing when no stories above threshold', async () => {
    mockGetStoryIdsByStatus.mockResolvedValue([])

    await runAssessStories()

    expect(mockGetStoryIdsByStatus).toHaveBeenCalledWith('pre_analyzed', { ratingMin: 5 })
    expect(mockAssessStories).not.toHaveBeenCalled()
  })

  it('handles errors in assessment result', async () => {
    mockGetStoryIdsByStatus.mockResolvedValue(['story-1', 'story-2'])
    mockAssessStories.mockResolvedValue({ completed: 1, errors: 1 })

    await runAssessStories()

    expect(mockAssessStories).toHaveBeenCalledWith(['story-1', 'story-2'])
  })
})
