import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sampleStory, sampleFeed, sampleIssue } from '../test/helpers.js'

const mockGetStoriesByStatus = vi.hoisted(() => vi.fn())
const mockAssessStory = vi.hoisted(() => vi.fn())

vi.mock('../services/story.js', () => ({
  getStoriesByStatus: mockGetStoriesByStatus,
}))
vi.mock('../services/analysis.js', () => ({
  assessStory: mockAssessStory,
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
    mockAssessStory.mockResolvedValue(undefined)

    await runAssessStories()

    expect(mockGetStoriesByStatus).toHaveBeenCalledWith('pre_analyzed', { ratingMin: 4 })
    expect(mockAssessStory).toHaveBeenCalledTimes(2)
    expect(mockAssessStory).toHaveBeenCalledWith('story-1')
    expect(mockAssessStory).toHaveBeenCalledWith('story-2')
  })

  it('does nothing when no stories above threshold', async () => {
    mockGetStoriesByStatus.mockResolvedValue([])

    await runAssessStories()

    expect(mockGetStoriesByStatus).toHaveBeenCalledWith('pre_analyzed', { ratingMin: 4 })
    expect(mockAssessStory).not.toHaveBeenCalled()
  })

  it('continues processing when one story fails', async () => {
    const stories = [
      { ...sampleStory({ id: 'story-1' }), feed: { ...sampleFeed(), issue: sampleIssue() } },
      { ...sampleStory({ id: 'story-2' }), feed: { ...sampleFeed(), issue: sampleIssue() } },
    ]
    mockGetStoriesByStatus.mockResolvedValue(stories)
    mockAssessStory.mockRejectedValueOnce(new Error('LLM error'))
    mockAssessStory.mockResolvedValueOnce(undefined)

    await runAssessStories()

    expect(mockAssessStory).toHaveBeenCalledTimes(2)
  })
})
