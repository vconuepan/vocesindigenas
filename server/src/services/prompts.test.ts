import { describe, it, expect } from 'vitest'
import { buildPreassessPrompt, buildReclassifyPrompt, buildAssessPrompt, buildSelectPrompt, buildPodcastPrompt } from '../prompts/index.js'

const guidelines = {
  factors: 'Technology advancement\nScientific discovery',
  antifactors: 'Limited geographic scope',
  ratings: '1-2: Minimal impact\n5-6: Moderate impact\n9-10: Transformative',
}

const issues = [
  { slug: 'ai-technology', name: 'AI & Technology', description: 'Artificial intelligence and tech advances' },
  { slug: 'climate', name: 'Climate', description: 'Climate change and environment' },
]

describe('buildPreassessPrompt', () => {
  it('includes article IDs and titles', () => {
    const stories = [
      { id: 'story-1', title: 'AI Breakthrough', content: 'Some content about AI...' },
      { id: 'story-2', title: 'Climate News', content: 'Climate change update...' },
    ]
    const prompt = buildPreassessPrompt(stories, issues)
    expect(prompt).toContain('Article ID: story-1')
    expect(prompt).toContain('Title: AI Breakthrough')
    expect(prompt).toContain('Article ID: story-2')
  })

  it('truncates content to 1200 chars', () => {
    const longContent = 'x'.repeat(2000)
    const stories = [{ id: 's1', title: 'Test', content: longContent }]
    const prompt = buildPreassessPrompt(stories, issues)
    const contentStart = prompt.indexOf('x'.repeat(100))
    expect(contentStart).toBeGreaterThan(-1)
    expect(prompt).not.toContain('x'.repeat(1500))
  })

  it('includes generic rating guidelines', () => {
    const stories = [{ id: 's1', title: 'Test', content: 'Content' }]
    const prompt = buildPreassessPrompt(stories, issues)
    expect(prompt).toContain('<RATING GUIDELINES>')
    expect(prompt).toContain('Moderate impact')
    expect(prompt).toContain('Exceptional impact')
  })

  it('does not include issue-specific guidelines', () => {
    const stories = [{ id: 's1', title: 'Test', content: 'Content' }]
    const prompt = buildPreassessPrompt(stories, issues)
    expect(prompt).not.toContain('<FACTORS>')
    expect(prompt).not.toContain('<CRITERIA>')
    expect(prompt).not.toContain('<TOPIC-SPECIFIC LIMITING FACTORS>')
  })

  it('includes issues XML block with slug, name, and description', () => {
    const stories = [{ id: 's1', title: 'Test', content: 'Content' }]
    const prompt = buildPreassessPrompt(stories, issues)
    expect(prompt).toContain('<ISSUES>')
    expect(prompt).toContain('</ISSUES>')
    expect(prompt).toContain('slug="ai-technology"')
    expect(prompt).toContain('name="AI &amp; Technology"')
    expect(prompt).toContain('Artificial intelligence and tech advances')
    expect(prompt).toContain('slug="climate"')
  })

  it('escapes XML characters in issue names', () => {
    const specialIssues = [
      { slug: 'test', name: 'Test & <Special>', description: 'Desc with "quotes"' },
    ]
    const stories = [{ id: 's1', title: 'Test', content: 'Content' }]
    const prompt = buildPreassessPrompt(stories, specialIssues)
    expect(prompt).toContain('name="Test &amp; &lt;Special&gt;"')
  })

  it('uses XML scaffolding structure', () => {
    const stories = [{ id: 's1', title: 'Test', content: 'Content' }]
    const prompt = buildPreassessPrompt(stories, issues)
    expect(prompt).toContain('<ROLE>')
    expect(prompt).toContain('<GOAL>')
    expect(prompt).toContain('<ARTICLES>')
    expect(prompt).toContain('</ARTICLES>')
  })

  it('does not contain legacy prompting patterns', () => {
    const stories = [{ id: 's1', title: 'Test', content: 'Content' }]
    const prompt = buildPreassessPrompt(stories, issues)
    expect(prompt).not.toContain('<STRUCTURE>')
    expect(prompt).not.toContain('Follow this prompt exactly')
    expect(prompt).not.toContain('Take a deep breath')
    expect(prompt).not.toContain('step by step')
  })
})

describe('buildReclassifyPrompt', () => {
  it('includes article IDs, titles, and content', () => {
    const stories = [
      { id: 'story-1', title: 'AI Breakthrough', content: 'Some content about AI...' },
    ]
    const prompt = buildReclassifyPrompt(stories, issues)
    expect(prompt).toContain('Article ID: story-1')
    expect(prompt).toContain('Title: AI Breakthrough')
    expect(prompt).toContain('Some content about AI...')
  })

  it('includes issues XML block', () => {
    const stories = [{ id: 's1', title: 'Test', content: 'Content' }]
    const prompt = buildReclassifyPrompt(stories, issues)
    expect(prompt).toContain('<ISSUES>')
    expect(prompt).toContain('slug="ai-technology"')
    expect(prompt).toContain('slug="climate"')
  })

  it('does NOT include rating guidelines', () => {
    const stories = [{ id: 's1', title: 'Test', content: 'Content' }]
    const prompt = buildReclassifyPrompt(stories, issues)
    expect(prompt).not.toContain('<RATING GUIDELINES>')
    expect(prompt).not.toContain('Moderate impact')
    expect(prompt).not.toContain('Exceptional impact')
  })

  it('asks for classification and emotion only, not rating', () => {
    const stories = [{ id: 's1', title: 'Test', content: 'Content' }]
    const prompt = buildReclassifyPrompt(stories, issues)
    expect(prompt).toContain('classify')
    expect(prompt).toContain('emotion')
    expect(prompt).toContain('Do not rate')
  })

  it('uses XML scaffolding structure', () => {
    const stories = [{ id: 's1', title: 'Test', content: 'Content' }]
    const prompt = buildReclassifyPrompt(stories, issues)
    expect(prompt).toContain('<ROLE>')
    expect(prompt).toContain('<GOAL>')
    expect(prompt).toContain('<ARTICLES>')
    expect(prompt).toContain('</ARTICLES>')
  })
})

describe('buildAssessPrompt', () => {
  it('includes article metadata', () => {
    const prompt = buildAssessPrompt('Test Title', 'Test content', 'BBC', 'https://bbc.com/article', guidelines)
    expect(prompt).toContain('Title: Test Title')
    expect(prompt).toContain('Publisher: BBC')
    expect(prompt).toContain('URL: https://bbc.com/article')
  })

  it('truncates content to 4000 chars', () => {
    const longContent = 'y'.repeat(5000)
    const prompt = buildAssessPrompt('Title', longContent, 'Pub', 'https://example.com', guidelines)
    expect(prompt).toContain('y'.repeat(4000))
    expect(prompt).not.toContain('y'.repeat(4500))
  })

  it('injects issue-specific guidelines', () => {
    const prompt = buildAssessPrompt('Title', 'Content', 'Pub', 'https://example.com', guidelines)
    expect(prompt).toContain('Technology advancement')
    expect(prompt).toContain('<CRITERIA>')
  })

  it('includes generic limiting factors section', () => {
    const prompt = buildAssessPrompt('Title', 'Content', 'Pub', 'https://example.com', guidelines)
    expect(prompt).toContain('<GENERIC_LIMITING_FACTORS>')
    expect(prompt).toContain('</GENERIC_LIMITING_FACTORS>')
  })

  it('uses XML scaffolding structure', () => {
    const prompt = buildAssessPrompt('Title', 'Content', 'Pub', 'https://example.com', guidelines)
    expect(prompt).toContain('<ROLE>')
    expect(prompt).toContain('<GOAL>')
    expect(prompt).toContain('<ARTICLE>')
    expect(prompt).toContain('<ANALYSIS_REQUIREMENTS>')
    expect(prompt).toContain('<GUIDELINES>')
  })

  it('does not contain legacy prompting patterns', () => {
    const prompt = buildAssessPrompt('Title', 'Content', 'Pub', 'https://example.com', guidelines)
    expect(prompt).not.toContain('<STRUCTURE>')
    expect(prompt).not.toContain('<STEPS>')
    expect(prompt).not.toContain('Follow this prompt exactly')
    expect(prompt).not.toContain('Take a deep breath')
    expect(prompt).not.toContain('Go through these steps one by one')
    expect(prompt).not.toContain('incredibly detailed')
  })
})

describe('buildSelectPrompt', () => {
  const stories = [
    {
      id: 'story-1',
      title: 'AI Progress',
      summary: 'Summary of AI article',
      relevanceReasons: 'Factor 1\nFactor 2',
      antifactors: 'Limiting factor 1',
      relevanceCalculation: 'Key factor: 6',
      emotionTag: 'uplifting',
    },
    {
      id: 'story-2',
      title: 'Climate Update',
      summary: 'Summary of climate article',
      relevanceReasons: 'Factor A',
      antifactors: 'Limiting factor A',
      relevanceCalculation: 'Key factor: 4',
      emotionTag: 'frustrating',
    },
  ]

  it('includes article XML blocks', () => {
    const prompt = buildSelectPrompt(stories, 1)
    expect(prompt).toContain('<ARTICLE>')
    expect(prompt).toContain('<ID>story-1</ID>')
    expect(prompt).toContain('<Title>AI Progress</Title>')
    expect(prompt).toContain('<Summary>Summary of AI article</Summary>')
  })

  it('includes selection count in goal', () => {
    const prompt = buildSelectPrompt(stories, 1)
    expect(prompt).toContain('1 articles from the 2 candidates')
  })

  it('uses XML scaffolding structure', () => {
    const prompt = buildSelectPrompt(stories, 1)
    expect(prompt).toContain('<ROLE>')
    expect(prompt).toContain('<GOAL>')
    expect(prompt).toContain('<SELECTION_CRITERIA>')
  })

  it('does not contain legacy prompting patterns', () => {
    const prompt = buildSelectPrompt(stories, 1)
    expect(prompt).not.toContain('<STRUCTURE>')
    expect(prompt).not.toContain('<STEPS>')
    expect(prompt).not.toContain('Follow this prompt exactly')
    expect(prompt).not.toContain('Take a deep breath')
    expect(prompt).not.toContain('Go through as many rounds')
    expect(prompt).not.toContain('step by step')
  })

  it('escapes XML characters in content', () => {
    const storiesWithSpecial = [{
      id: 's1',
      title: 'Test & <special>',
      summary: 'Summary with "quotes"',
      relevanceReasons: null,
      antifactors: null,
      relevanceCalculation: null,
      emotionTag: null,
    }]
    const prompt = buildSelectPrompt(storiesWithSpecial, 1)
    expect(prompt).toContain('&amp;')
    expect(prompt).toContain('&lt;special&gt;')
  })
})

describe('buildPodcastPrompt', () => {
  const stories = [
    {
      category: 'AI & Technology',
      title: 'AI Breakthrough',
      summary: 'Major AI advancement in reasoning',
      publisher: 'Nature',
      relevanceReasons: 'Technology factor\nScientific discovery',
      antifactors: 'Early stage technology',
    },
    {
      category: 'Climate',
      title: 'Climate Report',
      summary: 'New climate data released',
      publisher: 'Guardian',
      relevanceReasons: 'Environmental impact',
      antifactors: 'Report only',
    },
  ]

  it('includes STORY XML blocks with all fields', () => {
    const prompt = buildPodcastPrompt(stories)
    expect(prompt).toContain('<STORY>')
    expect(prompt).toContain('Category: AI & Technology')
    expect(prompt).toContain('Title: AI Breakthrough')
    expect(prompt).toContain('Summary of original article: Major AI advancement in reasoning')
    expect(prompt).toContain('Publisher of original article: Nature')
    expect(prompt).toContain('</STORY>')
  })

  it('formats relevance reasons as bullet points', () => {
    const prompt = buildPodcastPrompt(stories)
    expect(prompt).toContain('Relevance of the article\n- Technology factor\n- Scientific discovery')
  })

  it('formats antifactors as bullet points', () => {
    const prompt = buildPodcastPrompt(stories)
    expect(prompt).toContain('Limiting factors for the relevance\n- Early stage technology')
  })
})
