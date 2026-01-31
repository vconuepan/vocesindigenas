import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetStoryIdsByStatus = vi.hoisted(() => vi.fn())
const mockPreAssessStories = vi.hoisted(() => vi.fn())

vi.mock('../services/story.js', () => ({
  getStoryIdsByStatus: mockGetStoryIdsByStatus,
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
    mockGetStoryIdsByStatus.mockResolvedValue(['story-1', 'story-2'])
    mockPreAssessStories.mockResolvedValue([
      { storyId: 'story-1', rating: 3, emotionTag: 'calm' },
      { storyId: 'story-2', rating: 5, emotionTag: 'surprising' },
    ])

    await runPreassessStories()

    expect(mockGetStoryIdsByStatus).toHaveBeenCalledWith('fetched')
    expect(mockPreAssessStories).toHaveBeenCalledWith(['story-1', 'story-2'])
  })

  it('does nothing when no fetched stories', async () => {
    mockGetStoryIdsByStatus.mockResolvedValue([])

    await runPreassessStories()

    expect(mockGetStoryIdsByStatus).toHaveBeenCalledWith('fetched')
    expect(mockPreAssessStories).not.toHaveBeenCalled()
  })
})
