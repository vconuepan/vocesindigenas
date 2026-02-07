import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock prisma before importing the module
const mockPrisma = vi.hoisted(() => ({
  newsletter: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  story: {
    findMany: vi.fn(),
  },
  $disconnect: vi.fn(),
}))

vi.mock('../lib/prisma.js', () => ({ default: mockPrisma }))
vi.mock('./llm.js', () => ({
  getLLMByTier: vi.fn(() => ({
    withStructuredOutput: vi.fn(() => ({
      invoke: vi.fn().mockResolvedValue({ intro: 'A warm editorial intro sentence.' }),
    })),
  })),
  rateLimitDelay: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('../lib/retry.js', () => ({
  withRetry: vi.fn((fn: () => Promise<any>) => fn()),
}))

const { generateHtmlContent } = await import('./newsletter.js')

describe('generateHtmlContent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const baseNewsletter = {
    id: 'nl-1',
    title: 'Week 1 — Jan 2025',
    content: '',
    html: '',
    storyIds: [],
    selectedStoryIds: [],
    status: 'draft',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  /** Helper to build markdown content for a single story */
  function storyBlock(opts: {
    issue?: string
    issueSlug?: string
    title: string
    publisher: string
    url: string
    body: string
    relevanceUrl?: string
  }) {
    const lines: string[] = []
    if (opts.issue) {
      const slug = opts.issueSlug || 'general-news'
      lines.push(`# ${opts.issue} {${slug}}`, '')
    }
    const linkParts = [opts.publisher, `[original article](${opts.url})`]
    if (opts.relevanceUrl) linkParts.push(`[relevance analysis](${opts.relevanceUrl})`)
    const links = linkParts.join(' · ')
    lines.push(
      `## ${opts.title}`,
      links,
      '',
      opts.body,
    )
    return lines.join('\n')
  }

  it('renders issue section headers with colored dot', async () => {
    const content = storyBlock({
      issue: 'Climate & Environment',
      issueSlug: 'planet-climate',
      title: 'Rising sea levels threaten coastal cities',
      publisher: 'BBC News',
      url: 'https://example.com/sea-levels',
      body: 'Coastal cities face unprecedented flooding.',
    })

    mockPrisma.newsletter.findUnique.mockResolvedValue({ ...baseNewsletter, content })
    const html = await generateHtmlContent('nl-1')

    expect(html).toContain('Climate &amp; Environment')
    expect(html).toContain('text-transform: uppercase')
    expect(html).toContain('letter-spacing: 0.1em')
    // Teal dot for planet-climate
    expect(html).toContain('background-color: #2dd4bf')
    expect(html).toContain('border-radius: 50%')
  })

  it('uses default dot color for unknown issue slugs', async () => {
    const content = storyBlock({
      issue: 'Other',
      issueSlug: 'unknown-slug',
      title: 'Some story',
      publisher: 'Publisher',
      url: 'https://example.com',
      body: 'Body text.',
    })

    mockPrisma.newsletter.findUnique.mockResolvedValue({ ...baseNewsletter, content })
    const html = await generateHtmlContent('nl-1')

    // Default pink dot
    expect(html).toContain('background-color: #f472b6')
  })

  it('renders the intro section before stories', async () => {
    const content = [
      'Something hopeful happened in climate science.',
      '',
      '---',
      '',
      storyBlock({
        issue: 'Technology',
        issueSlug: 'science-technology',
        title: 'AI makes progress',
        publisher: 'Nature',
        url: 'https://example.com/ai',
        body: 'A major AI advancement.',
      }),
    ].join('\n')

    mockPrisma.newsletter.findUnique.mockResolvedValue({ ...baseNewsletter, content })
    const html = await generateHtmlContent('nl-1')

    const introIndex = html.indexOf('Something hopeful happened')
    const storyIndex = html.indexOf('AI makes progress')
    expect(introIndex).toBeGreaterThan(-1)
    expect(storyIndex).toBeGreaterThan(-1)
    expect(introIndex).toBeLessThan(storyIndex)
  })

  it('renders logo linked to homepage in header', async () => {
    const content = storyBlock({
      title: 'Test story',
      publisher: 'Publisher',
      url: 'https://example.com',
      body: 'Body text.',
    })

    mockPrisma.newsletter.findUnique.mockResolvedValue({ ...baseNewsletter, content })
    const html = await generateHtmlContent('nl-1')

    expect(html).toContain('href="https://actuallyrelevant.news"')
    expect(html).toContain('logo-text-horizontal.png')
    expect(html).toContain('alt="Actually Relevant"')
  })

  it('renders publisher with original article and relevance analysis links', async () => {
    const content = storyBlock({
      title: 'Discovery of new species',
      publisher: 'National Geographic',
      url: 'https://example.com/species',
      relevanceUrl: 'https://actuallyrelevant.news/stories/new-species',
      body: 'A new deep-sea species has been found.',
    })

    mockPrisma.newsletter.findUnique.mockResolvedValue({ ...baseNewsletter, content })
    const html = await generateHtmlContent('nl-1')

    expect(html).toContain('National Geographic')
    expect(html).toContain('>original article</a>')
    expect(html).toContain('>relevance analysis</a>')
    expect(html).toContain('href="https://example.com/species"')
    expect(html).toContain('href="https://actuallyrelevant.news/stories/new-species"')
    expect(html).toContain('&middot;')
  })

  it('renders publisher with only original article link when no relevance URL', async () => {
    const content = storyBlock({
      title: 'Story title',
      publisher: 'AP News',
      url: 'https://example.com/article',
      body: 'A short summary.',
    })

    mockPrisma.newsletter.findUnique.mockResolvedValue({ ...baseNewsletter, content })
    const html = await generateHtmlContent('nl-1')

    expect(html).toContain('AP News')
    expect(html).toContain('>original article</a>')
    expect(html).not.toContain('relevance analysis')
  })

  it('renders Support Us section with Ko-fi link', async () => {
    const content = storyBlock({
      title: 'Test story',
      publisher: 'Publisher',
      url: 'https://example.com',
      body: 'A blurb.',
    })

    mockPrisma.newsletter.findUnique.mockResolvedValue({ ...baseNewsletter, content })
    const html = await generateHtmlContent('nl-1')

    expect(html).toContain('ko-fi.com/odinmb')
    expect(html).toContain('Support Us')
    expect(html).toContain('Free. Independent. Without ads.')
  })

  it('renders unsubscribe link with Plunk template variable', async () => {
    const content = storyBlock({
      title: 'Test story',
      publisher: 'Publisher',
      url: 'https://example.com',
      body: 'A blurb.',
    })

    mockPrisma.newsletter.findUnique.mockResolvedValue({ ...baseNewsletter, content })
    const html = await generateHtmlContent('nl-1')

    expect(html).toContain('https://app.useplunk.com/unsubscribe/{{plunk_id}}')
    expect(html).toContain('Unsubscribe')
  })

  it('renders AI disclosure with divider and italic text', async () => {
    const content = storyBlock({
      title: 'Test story',
      publisher: 'Publisher',
      url: 'https://example.com',
      body: 'A blurb.',
    })

    mockPrisma.newsletter.findUnique.mockResolvedValue({ ...baseNewsletter, content })
    const html = await generateHtmlContent('nl-1')

    expect(html).toContain('Curated and written with care by AI')
    expect(html).toContain('font-size: 16px')
    expect(html).toContain('font-style: italic')
  })

  it('renders blockquote with quote and attribution', async () => {
    const content = [
      '## Quoted story',
      'Reuters · [original article](https://example.com/quoted)',
      '',
      '> "This is a significant finding for the field."',
      '> \u2014 Dr. Jane Smith, MIT',
    ].join('\n')

    mockPrisma.newsletter.findUnique.mockResolvedValue({ ...baseNewsletter, content })
    const html = await generateHtmlContent('nl-1')

    expect(html).toContain('This is a significant finding for the field.')
    expect(html).toContain('font-style: italic')
    expect(html).toContain('Dr. Jane Smith, MIT')
  })

  it('does not render border-bottom dividers between stories', async () => {
    const content = storyBlock({
      issue: 'Science',
      issueSlug: 'science-technology',
      title: 'Story one',
      publisher: 'BBC',
      url: 'https://example.com/one',
      body: 'First summary.',
    }) + '\n\n' + [
      '## Story two',
      'Wired · [original article](https://example.com/two)',
      '',
      'Second summary.',
    ].join('\n')

    mockPrisma.newsletter.findUnique.mockResolvedValue({ ...baseNewsletter, content })
    const html = await generateHtmlContent('nl-1')

    expect(html).toContain('Story one')
    expect(html).toContain('Story two')
    // Story cells should not have border-bottom dividers
    const storyTds = html.match(/<td style="padding: 20px[^"]*">/g)
    expect(storyTds).toBeTruthy()
    for (const td of storyTds!) {
      expect(td).not.toContain('border-bottom')
    }
  })

  it('links story title to source URL', async () => {
    const content = storyBlock({
      title: 'Linked story title',
      publisher: 'Publisher',
      url: 'https://example.com/linked',
      body: 'Body text.',
    })

    mockPrisma.newsletter.findUnique.mockResolvedValue({ ...baseNewsletter, content })
    const html = await generateHtmlContent('nl-1')

    expect(html).toContain('<a href="https://example.com/linked" style="color: #171717; text-decoration: none;">Linked story title</a>')
  })

  it('escapes HTML entities in content', async () => {
    const content = [
      '## Story with <tags> & "quotes"',
      'Publisher & Co · [original article](https://example.com)',
      '',
      'Content with <html> & entities.',
    ].join('\n')

    mockPrisma.newsletter.findUnique.mockResolvedValue({ ...baseNewsletter, content })
    const html = await generateHtmlContent('nl-1')

    expect(html).toContain('&lt;tags&gt;')
    expect(html).toContain('&amp;')
    expect(html).toContain('&quot;quotes&quot;')
  })

  it('throws if newsletter not found', async () => {
    mockPrisma.newsletter.findUnique.mockResolvedValue(null)
    await expect(generateHtmlContent('bad-id')).rejects.toThrow('Newsletter not found')
  })

  it('throws if no content', async () => {
    mockPrisma.newsletter.findUnique.mockResolvedValue({ ...baseNewsletter, content: '' })
    await expect(generateHtmlContent('nl-1')).rejects.toThrow('No content to convert')
  })

  it('handles multiple issues with separate section headers', async () => {
    const content = [
      storyBlock({
        issue: 'Climate',
        issueSlug: 'planet-climate',
        title: 'Climate story',
        publisher: 'BBC',
        url: 'https://example.com/climate',
        body: 'Climate summary.',
      }),
      '',
      '---',
      '',
      storyBlock({
        issue: 'Technology',
        issueSlug: 'science-technology',
        title: 'Tech story',
        publisher: 'Wired',
        url: 'https://example.com/tech',
        body: 'Tech summary.',
      }),
    ].join('\n')

    mockPrisma.newsletter.findUnique.mockResolvedValue({ ...baseNewsletter, content })
    const html = await generateHtmlContent('nl-1')

    // Both section headers with correct colors
    expect(html).toContain('Climate')
    expect(html).toContain('#2dd4bf') // teal for planet-climate
    expect(html).toContain('Technology')
    expect(html).toContain('#818cf8') // indigo for science-technology

    expect(html).toContain('Climate story')
    expect(html).toContain('Tech story')
  })
})
