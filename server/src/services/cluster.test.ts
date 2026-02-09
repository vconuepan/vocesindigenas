import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPrisma = vi.hoisted(() => ({
  story: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
  },
  storyCluster: {
    create: vi.fn(),
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
  createManualCluster,
  searchStoriesForCluster,
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
    expect(mockAutoRejectNonPrimary).toHaveBeenCalledWith('c1', { includePublished: true })
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
    expect(mockAutoRejectNonPrimary).toHaveBeenCalledWith('c1', { includePublished: true })
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
    expect(mockAutoRejectNonPrimary).toHaveBeenCalledWith('c1', { includePublished: true })
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

describe('createManualCluster', () => {
  beforeEach(() => vi.clearAllMocks())

  it('throws if fewer than 2 stories', async () => {
    await expect(createManualCluster(['s1'], 's1')).rejects.toThrow(
      'At least 2 stories are required',
    )
  })

  it('throws if primaryStoryId not in storyIds', async () => {
    await expect(createManualCluster(['s1', 's2'], 's3')).rejects.toThrow(
      'Primary story must be one of the selected stories',
    )
  })

  it('throws if some stories not found', async () => {
    mockPrisma.story.findMany.mockResolvedValue([
      { id: 's1', clusterId: null, title: 'Story 1' },
    ])

    await expect(createManualCluster(['s1', 's2'], 's1')).rejects.toThrow(
      'Stories not found: s2',
    )
  })

  it('throws with ALREADY_CLUSTERED code if stories are in clusters', async () => {
    mockPrisma.story.findMany.mockResolvedValue([
      { id: 's1', clusterId: null, title: 'Story 1' },
      { id: 's2', clusterId: 'existing-cluster', title: 'Story 2' },
    ])

    try {
      await createManualCluster(['s1', 's2'], 's1')
      expect.fail('Should have thrown')
    } catch (err: any) {
      expect(err.code).toBe('ALREADY_CLUSTERED')
      expect(err.storyIds).toEqual(['s2'])
      expect(err.message).toContain('Story 2')
    }
  })

  it('creates cluster with specified primary and auto-rejects', async () => {
    mockPrisma.story.findMany.mockResolvedValue([
      { id: 's1', clusterId: null, title: 'Story 1' },
      { id: 's2', clusterId: null, title: 'Story 2' },
    ])
    mockPrisma.storyCluster.create.mockResolvedValue({ id: 'new-cluster' })
    mockAutoRejectNonPrimary.mockResolvedValue(['s2'])
    // getClusterById re-fetch
    mockPrisma.storyCluster.findUnique.mockResolvedValue({
      id: 'new-cluster',
      primaryStoryId: 's1',
      stories: [
        { id: 's1', title: 'Story 1', status: 'analyzed' },
        { id: 's2', title: 'Story 2', status: 'rejected' },
      ],
    })

    const result = await createManualCluster(['s1', 's2'], 's1')

    expect(mockPrisma.storyCluster.create).toHaveBeenCalledWith({
      data: {
        primaryStoryId: 's1',
        stories: { connect: [{ id: 's1' }, { id: 's2' }] },
      },
    })
    expect(mockAutoRejectNonPrimary).toHaveBeenCalledWith('new-cluster', { includePublished: true })
    expect(result).toEqual(expect.objectContaining({ id: 'new-cluster' }))
  })
})

describe('searchStoriesForCluster', () => {
  beforeEach(() => vi.clearAllMocks())

  it('searches stories by title excluding trashed', async () => {
    const stories = [
      { id: 's1', title: 'Climate Change', sourceTitle: 'Source', status: 'analyzed', relevance: 7, clusterId: null },
    ]
    mockPrisma.story.findMany.mockResolvedValue(stories)

    const result = await searchStoriesForCluster('climate')

    expect(result).toEqual(stories)
    expect(mockPrisma.story.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: { not: 'trashed' },
          title: { contains: 'climate', mode: 'insensitive' },
        },
        take: 20,
      }),
    )
  })

  it('respects custom limit', async () => {
    mockPrisma.story.findMany.mockResolvedValue([])

    await searchStoriesForCluster('test', 5)

    expect(mockPrisma.story.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5 }),
    )
  })
})
