import { describe, it, expect } from 'vitest'
import { buildPreassessPrompt, buildAssessPrompt, buildSelectPrompt } from './prompts.js'

const guidelines = {
  factors: 'Technology advancement\nScientific discovery',
  antifactors: 'Limited geographic scope',
  ratings: '1-2: Minimal impact\n5-6: Moderate impact\n9-10: Transformative',
}

describe('buildPreassessPrompt', () => {
  it('includes article IDs and titles', () => {
    const stories = [
      { id: 'story-1', title: 'AI Breakthrough', content: 'Some content about AI...' },
      { id: 'story-2', title: 'Climate News', content: 'Climate change update...' },
    ]
    const prompt = buildPreassessPrompt(stories, guidelines)
    expect(prompt).toContain('Article ID: story-1')
    expect(prompt).toContain('Title: AI Breakthrough')
    expect(prompt).toContain('Article ID: story-2')
  })

  it('truncates content to 1200 chars', () => {
    const longContent = 'x'.repeat(2000)
    const stories = [{ id: 's1', title: 'Test', content: longContent }]
    const prompt = buildPreassessPrompt(stories, guidelines)
    // Content should be truncated — the prompt shouldn't contain the full 2000 chars
    const contentStart = prompt.indexOf('x'.repeat(100))
    expect(contentStart).toBeGreaterThan(-1)
    expect(prompt).not.toContain('x'.repeat(1500))
  })

  it('includes guidelines', () => {
    const stories = [{ id: 's1', title: 'Test', content: 'Content' }]
    const prompt = buildPreassessPrompt(stories, guidelines)
    expect(prompt).toContain('Technology advancement')
    expect(prompt).toContain('Limited geographic scope')
    expect(prompt).toContain('Moderate impact')
  })

  it('includes emotion tag options', () => {
    const stories = [{ id: 's1', title: 'Test', content: 'Content' }]
    const prompt = buildPreassessPrompt(stories, guidelines)
    expect(prompt).toContain('Uplifting')
    expect(prompt).toContain('Surprising')
    expect(prompt).toContain('Frustrating')
    expect(prompt).toContain('Scary')
    expect(prompt).toContain('Calm')
  })

  it('includes structure template', () => {
    const stories = [{ id: 's1', title: 'Test', content: 'Content' }]
    const prompt = buildPreassessPrompt(stories, guidelines)
    expect(prompt).toContain('Article #[ID]: [rating], [emotion tag]')
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

  it('includes guidelines', () => {
    const prompt = buildAssessPrompt('Title', 'Content', 'Pub', 'https://example.com', guidelines)
    expect(prompt).toContain('Technology advancement')
    expect(prompt).toContain('<CRITERIA>')
  })

  it('includes generic limiting factors', () => {
    const prompt = buildAssessPrompt('Title', 'Content', 'Pub', 'https://example.com', guidelines)
    expect(prompt).toContain('<GENERIC LIMITING FACTORS>')
    expect(prompt).toContain('opinion piece')
    expect(prompt).toContain('click-baity')
  })

  it('includes output structure', () => {
    const prompt = buildAssessPrompt('Title', 'Content', 'Pub', 'https://example.com', guidelines)
    expect(prompt).toContain('Publication date:')
    expect(prompt).toContain('Conservative rating:')
    expect(prompt).toContain('Speculative rating:')
    expect(prompt).toContain('Marketing blurb:')
  })
})

describe('buildSelectPrompt', () => {
  const stories = [
    {
      id: 'story-1',
      title: 'AI Progress',
      aiSummary: 'Summary of AI article',
      aiRelevanceReasons: 'Factor 1\nFactor 2',
      aiAntifactors: 'Limiting factor 1',
      aiRelevanceCalculation: 'Key factor: 6',
    },
    {
      id: 'story-2',
      title: 'Climate Update',
      aiSummary: 'Summary of climate article',
      aiRelevanceReasons: 'Factor A',
      aiAntifactors: 'Limiting factor A',
      aiRelevanceCalculation: 'Key factor: 4',
    },
  ]

  it('includes article XML blocks', () => {
    const prompt = buildSelectPrompt(stories, 1)
    expect(prompt).toContain('<ARTICLE>')
    expect(prompt).toContain('<ID>story-1</ID>')
    expect(prompt).toContain('<Title>AI Progress</Title>')
    expect(prompt).toContain('<Summary>Summary of AI article</Summary>')
  })

  it('includes selection count', () => {
    const prompt = buildSelectPrompt(stories, 1)
    expect(prompt).toContain('Select a total of 1 articles out of the original list of 2')
  })

  it('includes round-based structure', () => {
    const prompt = buildSelectPrompt(stories, 1)
    expect(prompt).toContain('<THINKING>')
    expect(prompt).toContain('<ROUND 1>')
    expect(prompt).toContain('<SELECTED ARTICLES>')
  })

  it('escapes XML characters in content', () => {
    const storiesWithSpecial = [{
      id: 's1',
      title: 'Test & <special>',
      aiSummary: 'Summary with "quotes"',
      aiRelevanceReasons: null,
      aiAntifactors: null,
      aiRelevanceCalculation: null,
    }]
    const prompt = buildSelectPrompt(storiesWithSpecial, 1)
    expect(prompt).toContain('&amp;')
    expect(prompt).toContain('&lt;special&gt;')
  })
})
