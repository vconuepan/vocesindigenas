import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPrisma = vi.hoisted(() => ({
  story: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    groupBy: vi.fn(),
  },
  feed: {
    findUnique: vi.fn(),
  },
  $disconnect: vi.fn(),
  $transaction: vi.fn((args: any) => Array.isArray(args) ? Promise.all(args) : args()),
}))

vi.mock('../lib/prisma.js', () => ({ default: mockPrisma }))

const { getStoryIdsByStatus, generateUniqueSlugs, getStories } = await import('./story.js')

describe('getStories', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('excludes sourceContent from admin list query', async () => {
    mockPrisma.story.findMany.mockResolvedValue([])
    mockPrisma.story.count.mockResolvedValue(0)

    await getStories({})

    const call = mockPrisma.story.findMany.mock.calls[0][0]
    expect(call.select).toBeDefined()
    expect(call.select.sourceContent).toBeUndefined()
    expect(call.select.id).toBe(true)
    expect(call.select.title).toBe(true)
    expect(call.select.status).toBe(true)
    expect(call.select.feed).toBeDefined()
  })

  it('includes feed with issue in select', async () => {
    mockPrisma.story.findMany.mockResolvedValue([])
    mockPrisma.story.count.mockResolvedValue(0)

    await getStories({})

    const call = mockPrisma.story.findMany.mock.calls[0][0]
    expect(call.select.feed.select.id).toBe(true)
    expect(call.select.feed.select.title).toBe(true)
    expect(call.select.feed.select.issue).toBeDefined()
  })
})

describe('getStoryIdsByStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns story IDs filtered by status', async () => {
    mockPrisma.story.findMany.mockResolvedValue([
      { id: 'id-1' },
      { id: 'id-2' },
    ])

    const result = await getStoryIdsByStatus('analyzed')

    expect(result).toEqual(['id-1', 'id-2'])
    expect(mockPrisma.story.findMany).toHaveBeenCalledWith({
      where: { status: 'analyzed' },
      select: { id: true },
      orderBy: { dateCrawled: 'desc' },
    })
  })

  it('returns empty array when no stories match', async () => {
    mockPrisma.story.findMany.mockResolvedValue([])

    const result = await getStoryIdsByStatus('published')

    expect(result).toEqual([])
  })

  it('applies ratingMin filter (relevancePre >= value)', async () => {
    mockPrisma.story.findMany.mockResolvedValue([{ id: 'id-3' }])

    await getStoryIdsByStatus('pre_analyzed', { ratingMin: 3 })

    expect(mockPrisma.story.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: 'pre_analyzed',
          relevancePre: { gte: 3 },
        },
      }),
    )
  })

  it('applies relevanceMin filter (relevance >= value)', async () => {
    mockPrisma.story.findMany.mockResolvedValue([{ id: 'id-4' }])

    await getStoryIdsByStatus('analyzed', { relevanceMin: 5 })

    expect(mockPrisma.story.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: 'analyzed',
          relevance: { gte: 5 },
        },
      }),
    )
  })

  it('applies hoursAgo filter (dateCrawled >= now - hours)', async () => {
    const now = Date.now()
    vi.spyOn(Date, 'now').mockReturnValue(now)
    mockPrisma.story.findMany.mockResolvedValue([])

    await getStoryIdsByStatus('fetched', { hoursAgo: 24 })

    const expectedDate = new Date(now - 24 * 60 * 60 * 1000)
    expect(mockPrisma.story.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: 'fetched',
          dateCrawled: { gte: expectedDate },
        },
      }),
    )

    vi.restoreAllMocks()
  })

  it('applies limit option as take parameter', async () => {
    mockPrisma.story.findMany.mockResolvedValue([{ id: 'id-5' }])

    await getStoryIdsByStatus('analyzed', { limit: 10 })

    expect(mockPrisma.story.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
      }),
    )
  })

  it('does not include take when limit is not provided', async () => {
    mockPrisma.story.findMany.mockResolvedValue([])

    await getStoryIdsByStatus('fetched')

    const call = mockPrisma.story.findMany.mock.calls[0][0]
    expect(call).not.toHaveProperty('take')
  })

  it('combines multiple filter options', async () => {
    const now = Date.now()
    vi.spyOn(Date, 'now').mockReturnValue(now)
    mockPrisma.story.findMany.mockResolvedValue([{ id: 'id-6' }])

    await getStoryIdsByStatus('pre_analyzed', {
      ratingMin: 3,
      relevanceMin: 5,
      hoursAgo: 48,
      limit: 20,
    })

    expect(mockPrisma.story.findMany).toHaveBeenCalledWith({
      where: {
        status: 'pre_analyzed',
        relevancePre: { gte: 3 },
        relevance: { gte: 5 },
        dateCrawled: { gte: new Date(now - 48 * 60 * 60 * 1000) },
      },
      select: { id: true },
      orderBy: { dateCrawled: 'desc' },
      take: 20,
    })

    vi.restoreAllMocks()
  })
})

describe('generateUniqueSlugs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty map for empty input', async () => {
    const result = await generateUniqueSlugs([])

    expect(result).toEqual(new Map())
    expect(mockPrisma.story.findMany).not.toHaveBeenCalled()
  })

  it('generates slugs from titles', async () => {
    mockPrisma.story.findMany.mockResolvedValue([])

    const result = await generateUniqueSlugs([
      { id: 's1', title: 'Hello World', sourceTitle: 'Source Title' },
    ])

    expect(result.get('s1')).toBe('hello-world')
  })

  it('falls back to sourceTitle when title is null', async () => {
    mockPrisma.story.findMany.mockResolvedValue([])

    const result = await generateUniqueSlugs([
      { id: 's1', title: null, sourceTitle: 'My Source Article' },
    ])

    expect(result.get('s1')).toBe('my-source-article')
  })

  it('resolves conflicts with existing slugs in database', async () => {
    mockPrisma.story.findMany.mockResolvedValue([
      { slug: 'hello-world' },
    ])

    const result = await generateUniqueSlugs([
      { id: 's1', title: 'Hello World', sourceTitle: 'Source' },
    ])

    expect(result.get('s1')).toBe('hello-world-2')
  })

  it('resolves conflicts within the same batch', async () => {
    mockPrisma.story.findMany.mockResolvedValue([])

    const result = await generateUniqueSlugs([
      { id: 's1', title: 'Same Title', sourceTitle: 'Source 1' },
      { id: 's2', title: 'Same Title', sourceTitle: 'Source 2' },
      { id: 's3', title: 'Same Title', sourceTitle: 'Source 3' },
    ])

    expect(result.get('s1')).toBe('same-title')
    expect(result.get('s2')).toBe('same-title-2')
    expect(result.get('s3')).toBe('same-title-3')
  })

  it('resolves conflicts with both existing and batch slugs', async () => {
    mockPrisma.story.findMany.mockResolvedValue([
      { slug: 'hello-world' },
      { slug: 'hello-world-2' },
    ])

    const result = await generateUniqueSlugs([
      { id: 's1', title: 'Hello World', sourceTitle: 'Source' },
      { id: 's2', title: 'Hello World', sourceTitle: 'Source' },
    ])

    expect(result.get('s1')).toBe('hello-world-3')
    expect(result.get('s2')).toBe('hello-world-4')
  })

  it('excludes the stories being processed from the conflict check', async () => {
    mockPrisma.story.findMany.mockResolvedValue([])

    await generateUniqueSlugs([
      { id: 's1', title: 'Test Article', sourceTitle: 'Source' },
    ])

    expect(mockPrisma.story.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { notIn: ['s1'] },
          slug: { not: null },
        }),
      }),
    )
  })

  it('queries DB with unique base slugs for conflict detection', async () => {
    mockPrisma.story.findMany.mockResolvedValue([])

    await generateUniqueSlugs([
      { id: 's1', title: 'Alpha', sourceTitle: 'S1' },
      { id: 's2', title: 'Beta', sourceTitle: 'S2' },
      { id: 's3', title: 'Alpha', sourceTitle: 'S3' },
    ])

    const call = mockPrisma.story.findMany.mock.calls[0][0]
    // Should have OR conditions for unique bases only (alpha and beta)
    expect(call.where.OR).toHaveLength(2)
    expect(call.where.OR).toEqual(
      expect.arrayContaining([
        { slug: { startsWith: 'alpha' } },
        { slug: { startsWith: 'beta' } },
      ]),
    )
  })

  it('handles special characters in titles', async () => {
    mockPrisma.story.findMany.mockResolvedValue([])

    const result = await generateUniqueSlugs([
      { id: 's1', title: 'AI & Machine Learning: 2024 Update!', sourceTitle: 'Source' },
    ])

    // slugify converts special chars to hyphens
    expect(result.get('s1')).toBe('ai-machine-learning-2024-update')
  })

  it('returns correct map size for multiple stories', async () => {
    mockPrisma.story.findMany.mockResolvedValue([])

    const result = await generateUniqueSlugs([
      { id: 's1', title: 'Article One', sourceTitle: 'Source 1' },
      { id: 's2', title: 'Article Two', sourceTitle: 'Source 2' },
      { id: 's3', title: 'Article Three', sourceTitle: 'Source 3' },
    ])

    expect(result.size).toBe(3)
    expect(result.get('s1')).toBe('article-one')
    expect(result.get('s2')).toBe('article-two')
    expect(result.get('s3')).toBe('article-three')
  })
})
