import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetStoryIdsByStatus = vi.hoisted(() => vi.fn())
const mockSelectStoriesInGroups = vi.hoisted(() => vi.fn())
const mockPrisma = vi.hoisted(() => ({
  story: { updateMany: vi.fn() },
}))

vi.mock('../services/story.js', () => ({
  getStoryIdsByStatus: mockGetStoryIdsByStatus,
}))
vi.mock('../services/analysis.js', () => ({
  selectStoriesInGroups: mockSelectStoriesInGroups,
}))
vi.mock('../lib/prisma.js', () => ({ default: mockPrisma }))

const { runSelectStories } = await import('./selectStories.js')

describe('runSelectStories', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.story.updateMany.mockResolvedValue({ count: 0 })
  })

  it('selects from recent analyzed stories', async () => {
    mockGetStoryIdsByStatus
      .mockResolvedValueOnce(['story-1', 'story-2']) // snapshot: all analyzed
      .mockResolvedValueOnce(['story-1', 'story-2']) // qualified
    mockSelectStoriesInGroups.mockResolvedValue({ selected: 1, rejected: 1, errors: 0 })

    await runSelectStories()

    expect(mockGetStoryIdsByStatus).toHaveBeenCalledWith('analyzed', { relevanceMin: 5 })
    expect(mockSelectStoriesInGroups).toHaveBeenCalledWith(['story-1', 'story-2'])
  })

  it('does nothing when no analyzed stories', async () => {
    mockGetStoryIdsByStatus
      .mockResolvedValueOnce([]) // snapshot: all analyzed (empty)
      .mockResolvedValueOnce([]) // qualified (empty)

    await runSelectStories()

    expect(mockGetStoryIdsByStatus).toHaveBeenCalledWith('analyzed', { relevanceMin: 5 })
    expect(mockSelectStoriesInGroups).not.toHaveBeenCalled()
  })

  it('rejects analyzed stories below relevance threshold', async () => {
    mockGetStoryIdsByStatus
      .mockResolvedValueOnce(['story-1', 'story-2', 'story-3']) // snapshot: all analyzed
      .mockResolvedValueOnce(['story-1']) // qualified
    mockSelectStoriesInGroups.mockResolvedValue({ selected: 1, rejected: 0, errors: 0 })

    await runSelectStories()

    expect(mockPrisma.story.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['story-2', 'story-3'] }, status: 'analyzed' },
      data: { status: 'rejected' },
    })
  })

  it('does not reject when all analyzed stories qualify', async () => {
    mockGetStoryIdsByStatus
      .mockResolvedValueOnce(['story-1', 'story-2']) // snapshot: all analyzed
      .mockResolvedValueOnce(['story-1', 'story-2']) // qualified = same
    mockSelectStoriesInGroups.mockResolvedValue({ selected: 1, rejected: 1, errors: 0 })

    await runSelectStories()

    expect(mockPrisma.story.updateMany).not.toHaveBeenCalled()
  })

  it('rejects below-threshold stories even when no stories qualify', async () => {
    mockGetStoryIdsByStatus
      .mockResolvedValueOnce(['story-low-1', 'story-low-2']) // snapshot: all analyzed
      .mockResolvedValueOnce([]) // none qualify

    await runSelectStories()

    expect(mockSelectStoriesInGroups).not.toHaveBeenCalled()
    expect(mockPrisma.story.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['story-low-1', 'story-low-2'] }, status: 'analyzed' },
      data: { status: 'rejected' },
    })
  })
})
