import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sampleStory, sampleFeed, sampleIssue } from '../test/helpers.js'

const mockGetStoriesByStatus = vi.hoisted(() => vi.fn())
const mockPreAssessStories = vi.hoisted(() => vi.fn())

vi.mock('../services/story.js', () => ({
  getStoriesByStatus: mockGetStoriesByStatus,
}))
vi.mock('../services/analysis.js', () => ({
  preAssessStories: mockPreAssessStories,
}))

const { runPreassessStories } = await import('./preassessStories.js')

describe('runPreassessStories', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('pre-assesses all fetched stories', async () => {
    const stories = [
      { ...sampleStory({ id: 'story-1' }), feed: { ...sampleFeed(), issue: sampleIssue() } },
      { ...sampleStory({ id: 'story-2' }), feed: { ...sampleFeed(), issue: sampleIssue() } },
    ]
    mockGetStoriesByStatus.mockResolvedValue(stories)
    mockPreAssessStories.mockResolvedValue([
      { storyId: 'story-1', rating: 3, emotionTag: 'calm' },
      { storyId: 'story-2', rating: 5, emotionTag: 'surprising' },
    ])

    await runPreassessStories()

    expect(mockGetStoriesByStatus).toHaveBeenCalledWith('fetched')
    expect(mockPreAssessStories).toHaveBeenCalledWith(['story-1', 'story-2'])
  })

  it('does nothing when no fetched stories', async () => {
    mockGetStoriesByStatus.mockResolvedValue([])

    await runPreassessStories()

    expect(mockGetStoriesByStatus).toHaveBeenCalledWith('fetched')
    expect(mockPreAssessStories).not.toHaveBeenCalled()
  })
})
