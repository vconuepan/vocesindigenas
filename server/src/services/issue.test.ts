import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPrisma = vi.hoisted(() => ({
  issue: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  feed: {
    count: vi.fn(),
  },
  $disconnect: vi.fn(),
}))

vi.mock('../lib/prisma.js', () => ({ default: mockPrisma }))

const { getAllIssues, getIssueById, getPublicIssues, getPublicIssueBySlug } = await import('./issue.js')

describe('Issue Service — dynamic sourceNames', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAllIssues', () => {
    it('derives sourceNames from active feed titles', async () => {
      mockPrisma.issue.findMany.mockResolvedValue([
        {
          id: 'issue-1',
          name: 'AI & Technology',
          slug: 'ai-technology',
          description: '',
          promptFactors: '',
          promptAntifactors: '',
          promptRatings: '',
          parentId: null,
          intro: '',
          evaluationIntro: '',
          evaluationCriteria: '',
          sourceNames: '',
          makeADifference: '',
          createdAt: new Date(),
          updatedAt: new Date(),
          parent: null,
          children: [],
          feeds: [
            { title: 'TechCrunch', active: true, _count: { stories: 5 } },
            { title: 'Ars Technica', active: true, _count: { stories: 3 } },
            { title: 'Inactive Feed', active: false, _count: { stories: 1 } },
          ],
        },
      ])

      const issues = await getAllIssues()

      expect(issues[0].sourceNames).toEqual(['Ars Technica', 'TechCrunch'])
      expect(issues[0].publishedStoryCount).toBe(9)
    })

    it('returns empty sourceNames when issue has no active feeds', async () => {
      mockPrisma.issue.findMany.mockResolvedValue([
        {
          id: 'issue-1',
          name: 'Empty Issue',
          slug: 'empty',
          description: '',
          promptFactors: '',
          promptAntifactors: '',
          promptRatings: '',
          parentId: null,
          intro: '',
          evaluationIntro: '',
          evaluationCriteria: '',
          sourceNames: '',
          makeADifference: '',
          createdAt: new Date(),
          updatedAt: new Date(),
          parent: null,
          children: [],
          feeds: [],
        },
      ])

      const issues = await getAllIssues()

      expect(issues[0].sourceNames).toEqual([])
    })
  })

  describe('getIssueById', () => {
    it('derives sourceNames from active feed titles', async () => {
      mockPrisma.issue.findUnique.mockResolvedValue({
        id: 'issue-1',
        name: 'AI & Technology',
        slug: 'ai-technology',
        description: '',
        promptFactors: '',
        promptAntifactors: '',
        promptRatings: '',
        parentId: null,
        intro: '',
        evaluationIntro: '',
        evaluationCriteria: '',
        sourceNames: '',
        makeADifference: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        parent: null,
        children: [],
        feeds: [
          { title: 'Reuters', active: true },
          { title: 'Bloomberg', active: true },
          { title: 'Dead Source', active: false },
        ],
      })

      const issue = await getIssueById('issue-1')

      expect(issue).not.toBeNull()
      expect(issue!.sourceNames).toEqual(['Bloomberg', 'Reuters'])
    })

    it('returns empty sourceNames when no active feeds', async () => {
      mockPrisma.issue.findUnique.mockResolvedValue({
        id: 'issue-1',
        name: 'Empty',
        slug: 'empty',
        description: '',
        promptFactors: '',
        promptAntifactors: '',
        promptRatings: '',
        parentId: null,
        intro: '',
        evaluationIntro: '',
        evaluationCriteria: '',
        sourceNames: '',
        makeADifference: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        parent: null,
        children: [],
        feeds: [],
      })

      const issue = await getIssueById('issue-1')

      expect(issue!.sourceNames).toEqual([])
    })
  })

  describe('getPublicIssues', () => {
    it('derives sourceNames from active feed titles for parent and children', async () => {
      mockPrisma.issue.findMany.mockResolvedValue([
        {
          id: 'parent-1',
          name: 'Existential Risks',
          slug: 'existential-risks',
          description: '',
          intro: '',
          evaluationIntro: '',
          evaluationCriteria: '',
          sourceNames: '',
          makeADifference: '',
          parentId: null,
          feeds: [
            { title: 'Nature', active: true },
            { title: 'Paused Feed', active: false },
          ],
          children: [
            {
              id: 'child-1',
              name: 'AI Safety',
              slug: 'ai-safety',
              description: '',
              intro: '',
              evaluationIntro: '',
              evaluationCriteria: '',
              sourceNames: '',
              makeADifference: '',
              parentId: 'parent-1',
              feeds: [
                { title: 'Alignment Forum', active: true },
                { title: 'LessWrong', active: true },
              ],
            },
          ],
        },
      ])

      const issues = await getPublicIssues()

      expect(issues[0].sourceNames).toEqual(['Alignment Forum', 'LessWrong', 'Nature'])
      expect(issues[0].children[0].sourceNames).toEqual(['Alignment Forum', 'LessWrong'])
    })
  })

  describe('getPublicIssueBySlug', () => {
    it('derives sourceNames from active feed titles', async () => {
      mockPrisma.issue.findFirst.mockResolvedValue({
        id: 'issue-1',
        name: 'AI & Technology',
        slug: 'ai-technology',
        description: '',
        intro: '',
        evaluationIntro: '',
        evaluationCriteria: '',
        sourceNames: '',
        makeADifference: '',
        parentId: null,
        feeds: [
          { title: 'Wired', active: true },
          { title: 'MIT Tech Review', active: true },
        ],
        children: [
          {
            id: 'child-1',
            name: 'AI Safety',
            slug: 'ai-safety',
            description: '',
            intro: '',
            evaluationIntro: '',
            evaluationCriteria: '',
            sourceNames: '',
            makeADifference: '',
            parentId: 'issue-1',
            feeds: [
              { title: 'Alignment Forum', active: true, _count: { stories: 2 } },
              { title: 'Inactive', active: false, _count: { stories: 1 } },
            ],
          },
        ],
        parent: null,
      })

      const issue = await getPublicIssueBySlug('ai-technology')

      expect(issue).not.toBeNull()
      expect(issue!.sourceNames).toEqual(['Alignment Forum', 'MIT Tech Review', 'Wired'])
      expect(issue!.children[0].sourceNames).toEqual(['Alignment Forum'])
      expect(issue!.children[0].publishedStoryCount).toBe(3)
    })

    it('returns null for unknown slug', async () => {
      mockPrisma.issue.findFirst.mockResolvedValue(null)

      const issue = await getPublicIssueBySlug('nonexistent')

      expect(issue).toBeNull()
    })
  })
})
