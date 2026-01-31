import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sampleStory, sampleFeed, sampleIssue } from '../test/helpers.js'

const mockGetStoriesByStatus = vi.hoisted(() => vi.fn())
const mockAssessStories = vi.hoisted(() => vi.fn())

vi.mock('../services/story.js', () => ({
  getStoriesByStatus: mockGetStoriesByStatus,
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
    const stories = [
      { ...sampleStory({ id: 'story-1', relevancePre: 4 }), feed: { ...sampleFeed(), issue: sampleIssue() } },
      { ...sampleStory({ id: 'story-2', relevancePre: 5 }), feed: { ...sampleFeed(), issue: sampleIssue() } },
    ]
    mockGetStoriesByStatus.mockResolvedValue(stories)
    mockAssessStories.mockResolvedValue({ completed: 2, errors: 0 })

    await runAssessStories()

    expect(mockGetStoriesByStatus).toHaveBeenCalledWith('pre_analyzed', { ratingMin: 4 })
    expect(mockAssessStories).toHaveBeenCalledWith(['story-1', 'story-2'])
  })

  it('does nothing when no stories above threshold', async () => {
    mockGetStoriesByStatus.mockResolvedValue([])

    await runAssessStories()

    expect(mockGetStoriesByStatus).toHaveBeenCalledWith('pre_analyzed', { ratingMin: 4 })
    expect(mockAssessStories).not.toHaveBeenCalled()
  })

  it('handles errors in assessment result', async () => {
    const stories = [
      { ...sampleStory({ id: 'story-1' }), feed: { ...sampleFeed(), issue: sampleIssue() } },
      { ...sampleStory({ id: 'story-2' }), feed: { ...sampleFeed(), issue: sampleIssue() } },
    ]
    mockGetStoriesByStatus.mockResolvedValue(stories)
    mockAssessStories.mockResolvedValue({ completed: 1, errors: 1 })

    await runAssessStories()

    expect(mockAssessStories).toHaveBeenCalledWith(['story-1', 'story-2'])
  })
})
