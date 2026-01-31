import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sampleStory, sampleFeed, sampleIssue } from '../test/helpers.js'

const mockGetStoriesByStatus = vi.hoisted(() => vi.fn())
const mockSelectStoriesInGroups = vi.hoisted(() => vi.fn())

vi.mock('../services/story.js', () => ({
  getStoriesByStatus: mockGetStoriesByStatus,
}))
vi.mock('../services/analysis.js', () => ({
  selectStoriesInGroups: mockSelectStoriesInGroups,
}))

const { runSelectStories } = await import('./selectStories.js')

describe('runSelectStories', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('selects from recent analyzed stories', async () => {
    const stories = [
      { ...sampleStory({ id: 'story-1', status: 'analyzed' }), feed: { ...sampleFeed(), issue: sampleIssue() } },
      { ...sampleStory({ id: 'story-2', status: 'analyzed' }), feed: { ...sampleFeed(), issue: sampleIssue() } },
    ]
    mockGetStoriesByStatus.mockResolvedValue(stories)
    mockSelectStoriesInGroups.mockResolvedValue({ selected: 1, rejected: 1, errors: 0 })

    await runSelectStories()

    expect(mockGetStoriesByStatus).toHaveBeenCalledWith('analyzed', { relevanceMin: 5 })
    expect(mockSelectStoriesInGroups).toHaveBeenCalledWith(['story-1', 'story-2'])
  })

  it('does nothing when no analyzed stories', async () => {
    mockGetStoriesByStatus.mockResolvedValue([])

    await runSelectStories()

    expect(mockGetStoriesByStatus).toHaveBeenCalledWith('analyzed', { relevanceMin: 5 })
    expect(mockSelectStoriesInGroups).not.toHaveBeenCalled()
  })
})
