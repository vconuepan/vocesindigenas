import { describe, it, expect } from 'vitest'
import { buildDedupPrompt, StoryForDedup, CandidateForDedup } from './dedup.js'

const source: StoryForDedup = {
  title: 'FDA Approves New Cancer Drug',
  summary: 'The FDA has approved a groundbreaking new cancer treatment drug.',
}

const candidates: CandidateForDedup[] = [
  { id: 'c1', title: 'FDA Greenlights Cancer Drug', summary: 'The same FDA approval for the cancer drug was announced today.' },
  { id: 'c2', title: 'New Climate Report Released', summary: 'A comprehensive climate report was published by the UN.' },
  { id: 'c3', title: 'Tech Company Launches Product', summary: 'A major tech company launched a new consumer product.' },
]

describe('buildDedupPrompt', () => {
  describe('XML structure', () => {
    it('contains all required top-level XML sections', () => {
      const prompt = buildDedupPrompt(source, candidates)
      expect(prompt).toContain('<ROLE>')
      expect(prompt).toContain('</ROLE>')
      expect(prompt).toContain('<TASK>')
      expect(prompt).toContain('</TASK>')
      expect(prompt).toContain('<RULES>')
      expect(prompt).toContain('</RULES>')
      expect(prompt).toContain('<SOURCE>')
      expect(prompt).toContain('</SOURCE>')
      expect(prompt).toContain('<CANDIDATES>')
      expect(prompt).toContain('</CANDIDATES>')
    })

    it('contains CANDIDATE elements inside CANDIDATES', () => {
      const prompt = buildDedupPrompt(source, candidates)
      expect(prompt).toContain('<CANDIDATE number=')
      expect(prompt).toContain('</CANDIDATE>')
    })
  })

  describe('source content', () => {
    it('includes source title and summary in SOURCE block', () => {
      const prompt = buildDedupPrompt(source, candidates)
      // Extract the SOURCE block
      const sourceBlock = prompt.substring(
        prompt.indexOf('<SOURCE>'),
        prompt.indexOf('</SOURCE>') + '</SOURCE>'.length,
      )
      expect(sourceBlock).toContain('FDA Approves New Cancer Drug')
      expect(sourceBlock).toContain('The FDA has approved a groundbreaking new cancer treatment drug.')
    })

    it('wraps source title and summary in Title and Summary tags', () => {
      const prompt = buildDedupPrompt(source, candidates)
      expect(prompt).toContain('<Title>FDA Approves New Cancer Drug</Title>')
      expect(prompt).toContain('<Summary>The FDA has approved a groundbreaking new cancer treatment drug.</Summary>')
    })
  })

  describe('candidate numbering', () => {
    it('numbers candidates starting at 1', () => {
      const prompt = buildDedupPrompt(source, candidates)
      expect(prompt).toContain('<CANDIDATE number="1">')
      expect(prompt).toContain('<CANDIDATE number="2">')
      expect(prompt).toContain('<CANDIDATE number="3">')
    })

    it('does not contain a zero-indexed candidate', () => {
      const prompt = buildDedupPrompt(source, candidates)
      expect(prompt).not.toContain('number="0"')
    })

    it('includes correct title and summary for each candidate', () => {
      const prompt = buildDedupPrompt(source, candidates)

      // Candidate 1
      const c1Start = prompt.indexOf('<CANDIDATE number="1">')
      const c1End = prompt.indexOf('</CANDIDATE>', c1Start)
      const c1Block = prompt.substring(c1Start, c1End)
      expect(c1Block).toContain('FDA Greenlights Cancer Drug')
      expect(c1Block).toContain('The same FDA approval for the cancer drug was announced today.')

      // Candidate 2
      const c2Start = prompt.indexOf('<CANDIDATE number="2">')
      const c2End = prompt.indexOf('</CANDIDATE>', c2Start)
      const c2Block = prompt.substring(c2Start, c2End)
      expect(c2Block).toContain('New Climate Report Released')
    })

    it('assigns sequential numbers for a single candidate', () => {
      const singleCandidate = [candidates[0]]
      const prompt = buildDedupPrompt(source, singleCandidate)
      expect(prompt).toContain('<CANDIDATE number="1">')
      expect(prompt).not.toContain('<CANDIDATE number="2">')
    })
  })

  describe('XML escaping', () => {
    it('escapes ampersands in source title', () => {
      const specialSource: StoryForDedup = {
        title: 'FDA & EMA Approve Drug',
        summary: 'Joint approval by FDA & EMA.',
      }
      const prompt = buildDedupPrompt(specialSource, [])
      expect(prompt).toContain('FDA &amp; EMA Approve Drug')
      expect(prompt).toContain('FDA &amp; EMA.')
    })

    it('escapes angle brackets in source content', () => {
      const specialSource: StoryForDedup = {
        title: 'Test <script>alert("xss")</script>',
        summary: 'Summary with <b>bold</b>',
      }
      const prompt = buildDedupPrompt(specialSource, [])
      expect(prompt).toContain('&lt;script&gt;')
      expect(prompt).toContain('&lt;b&gt;bold&lt;/b&gt;')
    })

    it('escapes quotes and apostrophes in candidate content', () => {
      const specialCandidates: CandidateForDedup[] = [
        { id: 'c1', title: 'He said "hello"', summary: "It's a test" },
      ]
      const prompt = buildDedupPrompt(source, specialCandidates)
      expect(prompt).toContain('&quot;hello&quot;')
      expect(prompt).toContain('It&apos;s a test')
    })

    it('escapes all five XML special characters together', () => {
      const specialSource: StoryForDedup = {
        title: 'A & B < C > D "E" F\'G',
        summary: 'test',
      }
      const prompt = buildDedupPrompt(specialSource, [])
      expect(prompt).toContain('&amp;')
      expect(prompt).toContain('&lt;')
      expect(prompt).toContain('&gt;')
      expect(prompt).toContain('&quot;')
      expect(prompt).toContain('&apos;')
    })
  })

  describe('strict criteria language', () => {
    it('requires exact same specific event', () => {
      const prompt = buildDedupPrompt(source, candidates)
      expect(prompt).toContain('exact same specific event')
    })

    it('instructs to default to not duplicate when uncertain', () => {
      const prompt = buildDedupPrompt(source, candidates)
      expect(prompt).toContain('When in doubt, mark as NOT a duplicate')
    })

    it('has a NOT A DUPLICATE section', () => {
      const prompt = buildDedupPrompt(source, candidates)
      expect(prompt).toContain('NOT A DUPLICATE')
    })

    it('contains negative examples for different events in same topic', () => {
      const prompt = buildDedupPrompt(source, candidates)
      // The prompt specifies that different specific events are not duplicates
      expect(prompt).toContain('DIFFERENT specific events')
    })
  })

  describe('empty candidates', () => {
    it('still has CANDIDATES wrapper when candidates list is empty', () => {
      const prompt = buildDedupPrompt(source, [])
      expect(prompt).toContain('<CANDIDATES>')
      expect(prompt).toContain('</CANDIDATES>')
    })

    it('does not contain any CANDIDATE elements when empty', () => {
      const prompt = buildDedupPrompt(source, [])
      expect(prompt).not.toContain('<CANDIDATE number=')
    })
  })

  describe('no legacy patterns', () => {
    it('does not contain "step by step"', () => {
      const prompt = buildDedupPrompt(source, candidates)
      expect(prompt.toLowerCase()).not.toContain('step by step')
    })

    it('does not contain "Take a deep breath"', () => {
      const prompt = buildDedupPrompt(source, candidates)
      expect(prompt).not.toContain('Take a deep breath')
    })

    it('does not contain "Follow this prompt exactly"', () => {
      const prompt = buildDedupPrompt(source, candidates)
      expect(prompt).not.toContain('Follow this prompt exactly')
    })

    it('does not contain legacy structure tags', () => {
      const prompt = buildDedupPrompt(source, candidates)
      expect(prompt).not.toContain('<STRUCTURE>')
      expect(prompt).not.toContain('<STEPS>')
    })
  })
})
