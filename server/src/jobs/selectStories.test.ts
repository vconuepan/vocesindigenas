import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetStoryIdsByStatus = vi.hoisted(() => vi.fn())
const mockSelectStoriesInGroups = vi.hoisted(() => vi.fn())

vi.mock('../services/story.js', () => ({
  getStoryIdsByStatus: mockGetStoryIdsByStatus,
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
    mockGetStoryIdsByStatus.mockResolvedValue(['story-1', 'story-2'])
    mockSelectStoriesInGroups.mockResolvedValue({ selected: 1, rejected: 1, errors: 0 })

    await runSelectStories()

    expect(mockGetStoryIdsByStatus).toHaveBeenCalledWith('analyzed', { relevanceMin: 5 })
    expect(mockSelectStoriesInGroups).toHaveBeenCalledWith(['story-1', 'story-2'])
  })

  it('does nothing when no analyzed stories', async () => {
    mockGetStoryIdsByStatus.mockResolvedValue([])

    await runSelectStories()

    expect(mockGetStoryIdsByStatus).toHaveBeenCalledWith('analyzed', { relevanceMin: 5 })
    expect(mockSelectStoriesInGroups).not.toHaveBeenCalled()
  })
})
