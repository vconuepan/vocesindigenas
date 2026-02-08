import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPrisma = vi.hoisted(() => ({
  story: {
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
  },
  storyCluster: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockUpdatePrimary = vi.hoisted(() => vi.fn())
const mockAutoRejectNonPrimary = vi.hoisted(() => vi.fn())

vi.mock('../lib/prisma.js', () => ({ default: mockPrisma }))
vi.mock('./dedup.js', () => ({
  updatePrimary: mockUpdatePrimary,
  autoRejectNonPrimary: mockAutoRejectNonPrimary,
}))

const {
  getAllClusters,
  getClusterById,
  setClusterPrimary,
  removeFromCluster,
  mergeClusters,
  dissolveCluster,
} = await import('./cluster.js')

describe('getAllClusters', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns clusters ordered by createdAt desc', async () => {
    const clusters = [{ id: 'c1' }, { id: 'c2' }]
    mockPrisma.storyCluster.findMany.mockResolvedValue(clusters)

    const result = await getAllClusters()

    expect(result).toEqual(clusters)
    expect(mockPrisma.storyCluster.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: 'desc' },
        include: expect.objectContaining({
          primaryStory: expect.any(Object),
          _count: { select: { stories: true } },
        }),
      }),
    )
  })
})

describe('getClusterById', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns cluster with stories ordered by dateCrawled', async () => {
    const cluster = { id: 'c1', stories: [] }
    mockPrisma.storyCluster.findUnique.mockResolvedValue(cluster)

    const result = await getClusterById('c1')

    expect(result).toEqual(cluster)
    expect(mockPrisma.storyCluster.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'c1' },
        include: expect.objectContaining({
          stories: expect.objectContaining({
            orderBy: { dateCrawled: 'asc' },
          }),
        }),
      }),
    )
  })
})

describe('setClusterPrimary', () => {
  beforeEach(() => vi.clearAllMocks())

  it('throws if story is not in the cluster', async () => {
    mockPrisma.story.findUnique.mockResolvedValue({ clusterId: 'other-cluster' })

    await expect(setClusterPrimary('c1', 's1')).rejects.toThrow(
      'Story is not a member of this cluster',
    )
  })

  it('throws if story is not found', async () => {
    mockPrisma.story.findUnique.mockResolvedValue(null)

    await expect(setClusterPrimary('c1', 's1')).rejects.toThrow(
      'Story is not a member of this cluster',
    )
  })

  it('updates primary and auto-rejects non-primary members', async () => {
    mockPrisma.story.findUnique.mockResolvedValue({ clusterId: 'c1' })
    mockPrisma.storyCluster.update.mockResolvedValue({})
    mockAutoRejectNonPrimary.mockResolvedValue([])
    mockPrisma.storyCluster.findUnique.mockResolvedValue({ id: 'c1', stories: [] })

    await setClusterPrimary('c1', 's1')

    expect(mockPrisma.storyCluster.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { primaryStoryId: 's1' },
    })
    expect(mockAutoRejectNonPrimary).toHaveBeenCalledWith('c1')
  })
})

describe('removeFromCluster', () => {
  beforeEach(() => vi.clearAllMocks())

  it('throws if story is not in the cluster', async () => {
    mockPrisma.story.findUnique.mockResolvedValue({ clusterId: 'other', status: 'analyzed' })

    await expect(removeFromCluster('c1', 's1')).rejects.toThrow(
      'Story is not a member of this cluster',
    )
  })

  it('removes story and dissolves cluster if <=1 remaining', async () => {
    mockPrisma.story.findUnique.mockResolvedValue({ clusterId: 'c1', status: 'analyzed' })
    mockPrisma.story.update.mockResolvedValue({})
    mockPrisma.story.count.mockResolvedValue(1)
    mockPrisma.story.updateMany.mockResolvedValue({ count: 1 })
    mockPrisma.storyCluster.delete.mockResolvedValue({})

    const result = await removeFromCluster('c1', 's1')

    expect(result).toBeNull()
    expect(mockPrisma.storyCluster.delete).toHaveBeenCalledWith({ where: { id: 'c1' } })
  })

  it('restores rejected story to analyzed when removed', async () => {
    mockPrisma.story.findUnique.mockResolvedValue({ clusterId: 'c1', status: 'rejected' })
    mockPrisma.story.update.mockResolvedValue({})
    mockPrisma.story.count.mockResolvedValue(3)
    mockUpdatePrimary.mockResolvedValue(undefined)
    mockAutoRejectNonPrimary.mockResolvedValue([])
    mockPrisma.storyCluster.findUnique.mockResolvedValue({ id: 'c1', stories: [] })

    await removeFromCluster('c1', 's1')

    // Single update: remove from cluster and restore to analyzed
    expect(mockPrisma.story.update).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: { clusterId: null, status: 'analyzed' },
    })
  })

  it('re-elects primary when >1 remaining', async () => {
    mockPrisma.story.findUnique.mockResolvedValue({ clusterId: 'c1', status: 'analyzed' })
    mockPrisma.story.update.mockResolvedValue({})
    mockPrisma.story.count.mockResolvedValue(2)
    mockUpdatePrimary.mockResolvedValue(undefined)
    mockAutoRejectNonPrimary.mockResolvedValue([])
    mockPrisma.storyCluster.findUnique.mockResolvedValue({ id: 'c1', stories: [] })

    await removeFromCluster('c1', 's1')

    expect(mockUpdatePrimary).toHaveBeenCalledWith('c1')
    expect(mockAutoRejectNonPrimary).toHaveBeenCalledWith('c1')
  })
})

describe('mergeClusters', () => {
  beforeEach(() => vi.clearAllMocks())

  it('throws when merging a cluster with itself', async () => {
    await expect(mergeClusters('c1', 'c1')).rejects.toThrow(
      'Cannot merge a cluster with itself',
    )
  })

  it('throws when target cluster not found', async () => {
    mockPrisma.storyCluster.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'c2' })

    await expect(mergeClusters('c1', 'c2')).rejects.toThrow('Target cluster not found')
  })

  it('throws when source cluster not found', async () => {
    mockPrisma.storyCluster.findUnique
      .mockResolvedValueOnce({ id: 'c1' })
      .mockResolvedValueOnce(null)

    await expect(mergeClusters('c1', 'c2')).rejects.toThrow('Source cluster not found')
  })

  it('moves source members to target and deletes source', async () => {
    mockPrisma.storyCluster.findUnique
      .mockResolvedValueOnce({ id: 'c1' })
      .mockResolvedValueOnce({ id: 'c2' })
      .mockResolvedValueOnce({ id: 'c1', stories: [] }) // getClusterById re-fetch
    mockPrisma.story.updateMany.mockResolvedValue({ count: 2 })
    mockPrisma.storyCluster.update.mockResolvedValue({})
    mockPrisma.storyCluster.delete.mockResolvedValue({})
    mockUpdatePrimary.mockResolvedValue(undefined)
    mockAutoRejectNonPrimary.mockResolvedValue([])

    await mergeClusters('c1', 'c2')

    expect(mockPrisma.story.updateMany).toHaveBeenCalledWith({
      where: { clusterId: 'c2' },
      data: { clusterId: 'c1' },
    })
    expect(mockPrisma.storyCluster.update).toHaveBeenCalledWith({
      where: { id: 'c2' },
      data: { primaryStoryId: null },
    })
    expect(mockPrisma.storyCluster.delete).toHaveBeenCalledWith({ where: { id: 'c2' } })
    expect(mockUpdatePrimary).toHaveBeenCalledWith('c1')
    expect(mockAutoRejectNonPrimary).toHaveBeenCalledWith('c1')
  })
})

describe('dissolveCluster', () => {
  beforeEach(() => vi.clearAllMocks())

  it('throws when cluster not found', async () => {
    mockPrisma.storyCluster.findUnique.mockResolvedValue(null)

    await expect(dissolveCluster('c-missing')).rejects.toThrow('Cluster not found')
  })

  it('restores rejected members, removes all, and deletes cluster', async () => {
    mockPrisma.storyCluster.findUnique.mockResolvedValue({ id: 'c1' })
    mockPrisma.story.updateMany.mockResolvedValue({ count: 2 })
    mockPrisma.storyCluster.delete.mockResolvedValue({})

    await dissolveCluster('c1')

    expect(mockPrisma.story.updateMany).toHaveBeenCalledWith({
      where: { clusterId: 'c1', status: 'rejected' },
      data: { status: 'analyzed' },
    })
    expect(mockPrisma.story.updateMany).toHaveBeenCalledWith({
      where: { clusterId: 'c1' },
      data: { clusterId: null },
    })
    expect(mockPrisma.storyCluster.delete).toHaveBeenCalledWith({ where: { id: 'c1' } })
  })
})
