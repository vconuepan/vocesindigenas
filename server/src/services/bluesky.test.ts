import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPrisma = vi.hoisted(() => ({
  story: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  blueskyPost: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  $disconnect: vi.fn(),
}))

const mockBlueskyClient = vi.hoisted(() => ({
  createPost: vi.fn(),
  getPostMetrics: vi.fn(),
  deletePost: vi.fn(),
  isBlueskyConfigured: vi.fn().mockReturnValue(true),
}))

const mockLlm = vi.hoisted(() => ({
  invoke: vi.fn(),
}))

vi.mock('../lib/prisma.js', () => ({ default: mockPrisma }))
vi.mock('../lib/bluesky.js', () => mockBlueskyClient)
vi.mock('./llm.js', () => ({
  getLLMByTier: vi.fn(() => ({
    withStructuredOutput: vi.fn(() => mockLlm),
  })),
  rateLimitDelay: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('../prompts/index.js', () => ({
  buildBlueskyPostPrompt: vi.fn(() => 'post prompt'),
  buildBlueskyPickBestPrompt: vi.fn(() => 'pick prompt'),
}))

const { assemblePostText, generateDraft, pickBestStory, updateDraft, deletePostRecord, publishPost, updateMetrics, listPosts } =
  await import('./bluesky.js')

describe('assemblePostText', () => {
  it('assembles metadata line and editorial text', () => {
    const result = assemblePostText({
      blurb: 'A great discovery.',
      issueName: 'Climate',
      emotionTag: 'uplifting',
      publisherName: 'Nature',
    })
    expect(result).toBe('A great discovery.\nClimate | Uplifting | found on Nature')
  })

  it('capitalizes emotion tag', () => {
    const result = assemblePostText({
      blurb: 'Blurb.',
      issueName: 'Climate',
      emotionTag: 'uplifting',
      publisherName: 'Nature',
    })
    expect(result).toContain('Uplifting')
    expect(result).not.toContain('uplifting')
  })

  it('omits issue when null', () => {
    const result = assemblePostText({
      blurb: 'Blurb.',
      issueName: null,
      emotionTag: 'calm',
      publisherName: 'Reuters',
    })
    expect(result).toContain('Calm | found on Reuters')
    expect(result).not.toContain('null')
  })

  it('omits emotion when null', () => {
    const result = assemblePostText({
      blurb: 'Blurb.',
      issueName: 'Science',
      emotionTag: null,
      publisherName: 'Reuters',
    })
    expect(result).toContain('Science | found on Reuters')
  })

  it('places metadata line after editorial text', () => {
    const result = assemblePostText({
      blurb: 'Editorial hook.',
      issueName: 'Science',
      emotionTag: 'calm',
      publisherName: 'Reuters',
    })
    const lines = result.split('\n')
    expect(lines[0]).toBe('Editorial hook.')
    expect(lines[1]).toContain('found on Reuters')
  })
})

describe('generateDraft', () => {
  beforeEach(() => vi.clearAllMocks())

  const mockStory = {
    id: 'story-1',
    title: 'Test Story',
    titleLabel: 'Tech',
    summary: 'A summary',
    relevanceSummary: 'Important because...',
    quote: 'A great quote',
    quoteAttribution: 'Author',
    emotionTag: 'uplifting',
    slug: 'test-story',
    sourceUrl: 'https://example.com/article',
    marketingBlurb: 'Short blurb',
    sourceTitle: 'Original Title',
    feed: { title: 'Example News', displayTitle: 'Example' },
    issue: { name: 'Technology' },
  }

  it('generates a draft post with assembled text', async () => {
    mockPrisma.story.findUnique.mockResolvedValue(mockStory)
    mockPrisma.blueskyPost.findFirst.mockResolvedValue(null)
    mockLlm.invoke.mockResolvedValue({ postText: 'A compelling editorial hook.' })
    mockPrisma.blueskyPost.create.mockResolvedValue({
      id: 'post-1',
      storyId: 'story-1',
      postText: 'A compelling editorial hook.\nTechnology | Uplifting | found on Example',
      status: 'draft',
      story: mockStory,
    })

    const result = await generateDraft('story-1')

    expect(result.status).toBe('draft')
    expect(mockPrisma.blueskyPost.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          storyId: 'story-1',
          postText: 'A compelling editorial hook.\nTechnology | Uplifting | found on Example',
          status: 'draft',
        }),
      }),
    )
  })

  it('throws if story not found', async () => {
    mockPrisma.story.findUnique.mockResolvedValue(null)
    await expect(generateDraft('missing')).rejects.toThrow('Story not found')
  })

  it('throws if story has no title', async () => {
    mockPrisma.story.findUnique.mockResolvedValue({ ...mockStory, title: null })
    await expect(generateDraft('story-1')).rejects.toThrow('must be fully analyzed')
  })

  it('throws if story already has a Bluesky post', async () => {
    mockPrisma.story.findUnique.mockResolvedValue(mockStory)
    mockPrisma.blueskyPost.findFirst.mockResolvedValue({ id: 'existing-post' })
    await expect(generateDraft('story-1')).rejects.toThrow('already has a Bluesky post')
  })
})

describe('pickBestStory', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns the only candidate without LLM call', async () => {
    mockPrisma.story.findMany.mockResolvedValue([
      { id: 'story-1', title: 'One', titleLabel: 'A', summary: 'S', relevance: 8, emotionTag: 'calm', issue: null, datePublished: null },
    ])
    mockPrisma.blueskyPost.findMany.mockResolvedValue([])

    const result = await pickBestStory(['story-1'])
    expect(result.storyId).toBe('story-1')
    expect(mockLlm.invoke).not.toHaveBeenCalled()
  })

  it('calls LLM to pick from multiple candidates', async () => {
    mockPrisma.story.findMany.mockResolvedValue([
      { id: 'story-1', title: 'One', titleLabel: 'A', summary: 'S1', relevance: 8, emotionTag: 'calm', issue: null, datePublished: null },
      { id: 'story-2', title: 'Two', titleLabel: 'B', summary: 'S2', relevance: 7, emotionTag: 'uplifting', issue: null, datePublished: null },
    ])
    mockPrisma.blueskyPost.findMany.mockResolvedValue([])
    mockLlm.invoke.mockResolvedValue({ storyId: 'story-2', reasoning: 'More engaging' })

    const result = await pickBestStory(['story-1', 'story-2'])
    expect(result.storyId).toBe('story-2')
    expect(result.reasoning).toBe('More engaging')
  })

  it('excludes already-posted stories', async () => {
    mockPrisma.story.findMany.mockResolvedValue([
      { id: 'story-1', title: 'One', titleLabel: 'A', summary: 'S', relevance: 8, emotionTag: 'calm', issue: null, datePublished: null },
      { id: 'story-2', title: 'Two', titleLabel: 'B', summary: 'S', relevance: 7, emotionTag: 'calm', issue: null, datePublished: null },
    ])
    mockPrisma.blueskyPost.findMany.mockResolvedValue([{ storyId: 'story-1' }])

    const result = await pickBestStory(['story-1', 'story-2'])
    expect(result.storyId).toBe('story-2')
  })

  it('throws when all stories already posted', async () => {
    mockPrisma.story.findMany.mockResolvedValue([
      { id: 'story-1', title: 'One', titleLabel: 'A', summary: 'S', relevance: 8, emotionTag: 'calm', issue: null, datePublished: null },
    ])
    mockPrisma.blueskyPost.findMany.mockResolvedValue([{ storyId: 'story-1' }])

    await expect(pickBestStory(['story-1'])).rejects.toThrow('already have a Bluesky post')
  })
})

describe('updateDraft', () => {
  beforeEach(() => vi.clearAllMocks())

  it('updates draft text', async () => {
    mockPrisma.blueskyPost.findUnique.mockResolvedValue({ id: 'post-1', status: 'draft' })
    mockPrisma.blueskyPost.update.mockResolvedValue({ id: 'post-1', postText: 'Updated text', status: 'draft' })

    const result = await updateDraft('post-1', 'Updated text')
    expect(result.postText).toBe('Updated text')
  })

  it('throws when post not found', async () => {
    mockPrisma.blueskyPost.findUnique.mockResolvedValue(null)
    await expect(updateDraft('missing', 'text')).rejects.toThrow('Post not found')
  })

  it('throws when post is not a draft', async () => {
    mockPrisma.blueskyPost.findUnique.mockResolvedValue({ id: 'post-1', status: 'published' })
    await expect(updateDraft('post-1', 'text')).rejects.toThrow('Can only edit draft posts')
  })
})

describe('deletePostRecord', () => {
  beforeEach(() => vi.clearAllMocks())

  it('deletes a draft post without calling Bluesky API', async () => {
    mockPrisma.blueskyPost.findUnique.mockResolvedValue({ id: 'post-1', status: 'draft', postUri: null })
    await deletePostRecord('post-1')
    expect(mockPrisma.blueskyPost.delete).toHaveBeenCalledWith({ where: { id: 'post-1' } })
    expect(mockBlueskyClient.deletePost).not.toHaveBeenCalled()
  })

  it('deletes a published post and removes from Bluesky', async () => {
    mockPrisma.blueskyPost.findUnique.mockResolvedValue({ id: 'post-1', status: 'published', postUri: 'at://did/post/1' })
    mockBlueskyClient.deletePost.mockResolvedValue(undefined)
    await deletePostRecord('post-1')
    expect(mockBlueskyClient.deletePost).toHaveBeenCalledWith('at://did/post/1')
    expect(mockPrisma.blueskyPost.delete).toHaveBeenCalledWith({ where: { id: 'post-1' } })
  })

  it('still deletes DB record if Bluesky API fails', async () => {
    mockPrisma.blueskyPost.findUnique.mockResolvedValue({ id: 'post-1', status: 'published', postUri: 'at://did/post/1' })
    mockBlueskyClient.deletePost.mockRejectedValue(new Error('Not found'))
    await deletePostRecord('post-1')
    expect(mockPrisma.blueskyPost.delete).toHaveBeenCalledWith({ where: { id: 'post-1' } })
  })

  it('throws when post not found', async () => {
    mockPrisma.blueskyPost.findUnique.mockResolvedValue(null)
    await expect(deletePostRecord('missing')).rejects.toThrow('Post not found')
  })
})

describe('publishPost', () => {
  beforeEach(() => vi.clearAllMocks())

  it('publishes a draft to Bluesky', async () => {
    const mockPost = {
      id: 'post-1',
      status: 'draft',
      postText: 'Great post',
      story: {
        slug: 'test-story',
        title: 'Test',
        sourceTitle: 'Original',
        sourceUrl: 'https://example.com',
        marketingBlurb: 'Blurb',
        summary: 'Summary',
        feed: { title: 'Feed', displayTitle: 'Feed Name' },
      },
    }
    mockPrisma.blueskyPost.findUnique.mockResolvedValue(mockPost)
    mockBlueskyClient.createPost.mockResolvedValue({ uri: 'at://did/post/1', cid: 'cid123' })
    mockPrisma.blueskyPost.update.mockResolvedValue({
      ...mockPost,
      status: 'published',
      postUri: 'at://did/post/1',
      postCid: 'cid123',
    })

    const result = await publishPost('post-1')
    expect(result.status).toBe('published')
    expect(mockBlueskyClient.createPost).toHaveBeenCalled()
  })

  it('marks as failed on API error', async () => {
    const mockPost = {
      id: 'post-1',
      status: 'draft',
      postText: 'Great post',
      story: {
        slug: 'test-story',
        title: 'Test',
        sourceTitle: 'Original',
        sourceUrl: 'https://example.com',
        marketingBlurb: 'Blurb',
        summary: 'Summary',
        feed: { title: 'Feed', displayTitle: 'Feed Name' },
      },
    }
    mockPrisma.blueskyPost.findUnique.mockResolvedValue(mockPost)
    mockBlueskyClient.createPost.mockRejectedValue(new Error('API error'))
    mockPrisma.blueskyPost.update.mockResolvedValue({ ...mockPost, status: 'failed', error: 'API error' })

    await expect(publishPost('post-1')).rejects.toThrow('API error')
    expect(mockPrisma.blueskyPost.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'failed', error: 'API error' }),
      }),
    )
  })
})

describe('updateMetrics', () => {
  beforeEach(() => vi.clearAllMocks())

  it('updates metrics for published posts', async () => {
    mockPrisma.blueskyPost.findMany.mockResolvedValue([
      { id: 'post-1', postUri: 'at://did/post/1' },
      { id: 'post-2', postUri: 'at://did/post/2' },
    ])
    mockBlueskyClient.getPostMetrics
      .mockResolvedValueOnce({ likeCount: 5, repostCount: 2, replyCount: 1, quoteCount: 0 })
      .mockResolvedValueOnce({ likeCount: 10, repostCount: 3, replyCount: 2, quoteCount: 1 })
    mockPrisma.blueskyPost.update.mockResolvedValue({})

    await updateMetrics()

    expect(mockPrisma.blueskyPost.update).toHaveBeenCalledTimes(2)
    expect(mockPrisma.blueskyPost.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'post-1' },
        data: expect.objectContaining({ likeCount: 5, repostCount: 2 }),
      }),
    )
  })

  it('continues on individual post failure', async () => {
    mockPrisma.blueskyPost.findMany.mockResolvedValue([
      { id: 'post-1', postUri: 'at://did/post/1' },
      { id: 'post-2', postUri: 'at://did/post/2' },
    ])
    mockBlueskyClient.getPostMetrics
      .mockRejectedValueOnce(new Error('Not found'))
      .mockResolvedValueOnce({ likeCount: 10, repostCount: 3, replyCount: 2, quoteCount: 1 })
    mockPrisma.blueskyPost.update.mockResolvedValue({})

    await updateMetrics()

    // Only the second post should have been updated
    expect(mockPrisma.blueskyPost.update).toHaveBeenCalledTimes(1)
  })
})

describe('listPosts', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns paginated posts', async () => {
    const posts = [{ id: 'post-1' }, { id: 'post-2' }]
    mockPrisma.blueskyPost.findMany.mockResolvedValue(posts)
    mockPrisma.blueskyPost.count.mockResolvedValue(10)

    const result = await listPosts({ page: 1, limit: 20 })
    expect(result.posts).toHaveLength(2)
    expect(result.total).toBe(10)
    expect(result.page).toBe(1)
  })

  it('filters by status', async () => {
    mockPrisma.blueskyPost.findMany.mockResolvedValue([])
    mockPrisma.blueskyPost.count.mockResolvedValue(0)

    await listPosts({ status: 'published' })

    expect(mockPrisma.blueskyPost.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'published' },
      }),
    )
  })
})
