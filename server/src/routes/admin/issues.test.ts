import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { authHeader, sampleIssue, TEST_API_KEY } from '../../test/helpers.js'

const PARENT_UUID = '00000000-0000-4000-8000-000000000001'
const CHILD_UUID = '00000000-0000-4000-8000-000000000002'
const ISSUE_UUID = '00000000-0000-4000-8000-000000000003'
const MISSING_UUID = '00000000-0000-4000-8000-000000000099'

vi.mock('express-rate-limit', () => ({
  default: () => (_req: any, _res: any, next: any) => next(),
}))

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

vi.mock('../../lib/prisma.js', () => ({ default: mockPrisma }))
vi.mock('../../services/crawler.js', () => ({
  crawlFeed: vi.fn(),
  crawlAllDueFeeds: vi.fn(),
  crawlUrl: vi.fn(),
}))

process.env.PUBLIC_API_KEY = TEST_API_KEY

const { default: app } = await import('../../app.js')

describe('Admin Issues API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/admin/issues', () => {
    it('returns 401 without auth header', async () => {
      const res = await request(app).get('/api/admin/issues')
      expect(res.status).toBe(401)
    })

    it('returns 401 with invalid auth', async () => {
      const res = await request(app)
        .get('/api/admin/issues')
        .set('Authorization', 'Bearer wrong-key')
      expect(res.status).toBe(401)
    })

    it('returns all issues with published story counts', async () => {
      const issues = [
        {
          ...sampleIssue(),
          parent: null,
          children: [],
          feeds: [{ title: 'Feed A', active: true, _count: { stories: 3 } }, { title: 'Feed B', active: true, _count: { stories: 1 } }],
        },
        {
          ...sampleIssue({ id: 'issue-2', name: 'Climate', slug: 'climate' }),
          parent: null,
          children: [],
          feeds: [],
        },
      ]
      mockPrisma.issue.findMany.mockResolvedValue(issues)

      const res = await request(app)
        .get('/api/admin/issues')
        .set(authHeader())
      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(2)
      expect(res.body[0].name).toBe('AI & Technology')
      expect(res.body[0].publishedStoryCount).toBe(4)
      expect(res.body[1].publishedStoryCount).toBe(0)
    })

    it('returns parent and children info', async () => {
      const parent = sampleIssue({ id: 'parent-1', name: 'Existential Risks', slug: 'existential-risks' })
      const issues = [
        {
          ...parent,
          parent: null,
          children: [{ id: 'child-1', name: 'AI Alignment', slug: 'ai-alignment' }],
          feeds: [],
        },
        {
          ...sampleIssue({ id: 'child-1', name: 'AI Alignment', slug: 'ai-alignment', parentId: 'parent-1' }),
          parent: { id: 'parent-1', name: 'Existential Risks', slug: 'existential-risks' },
          children: [],
          feeds: [],
        },
      ]
      mockPrisma.issue.findMany.mockResolvedValue(issues)

      const res = await request(app)
        .get('/api/admin/issues')
        .set(authHeader())
      expect(res.status).toBe(200)
      expect(res.body[0].children).toHaveLength(1)
      expect(res.body[0].children[0].name).toBe('AI Alignment')
      expect(res.body[1].parent.name).toBe('Existential Risks')
    })
  })

  describe('GET /api/admin/issues/:id', () => {
    it('returns a single issue with parent and children', async () => {
      mockPrisma.issue.findUnique.mockResolvedValue({
        ...sampleIssue(),
        parent: null,
        children: [],
        feeds: [{ title: 'Test Feed', active: true }],
      })

      const res = await request(app)
        .get('/api/admin/issues/issue-1')
        .set(authHeader())
      expect(res.status).toBe(200)
      expect(res.body.name).toBe('AI & Technology')
      expect(res.body.parent).toBeNull()
      expect(res.body.children).toEqual([])
    })

    it('returns 404 for unknown issue', async () => {
      mockPrisma.issue.findUnique.mockResolvedValue(null)

      const res = await request(app)
        .get('/api/admin/issues/unknown')
        .set(authHeader())
      expect(res.status).toBe(404)
    })
  })

  describe('POST /api/admin/issues', () => {
    it('creates a new issue', async () => {
      mockPrisma.issue.create.mockResolvedValue(sampleIssue())

      const res = await request(app)
        .post('/api/admin/issues')
        .set(authHeader())
        .send({ name: 'AI & Technology', slug: 'ai-technology' })
      expect(res.status).toBe(201)
      expect(res.body.name).toBe('AI & Technology')
    })

    it('creates a child issue with parentId', async () => {
      mockPrisma.issue.findUnique.mockResolvedValue(sampleIssue({ id: PARENT_UUID, parentId: null }))
      mockPrisma.issue.create.mockResolvedValue(sampleIssue({
        id: CHILD_UUID,
        name: 'AI Alignment',
        slug: 'ai-alignment',
        parentId: PARENT_UUID,
      }))

      const res = await request(app)
        .post('/api/admin/issues')
        .set(authHeader())
        .send({ name: 'AI Alignment', slug: 'ai-alignment', parentId: PARENT_UUID })
      expect(res.status).toBe(201)
      expect(res.body.parentId).toBe(PARENT_UUID)
    })

    it('returns 400 when parent does not exist', async () => {
      mockPrisma.issue.findUnique.mockResolvedValue(null)

      const res = await request(app)
        .post('/api/admin/issues')
        .set(authHeader())
        .send({ name: 'Test', slug: 'test', parentId: MISSING_UUID })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Parent issue not found')
    })

    it('returns 400 when trying to nest more than one level', async () => {
      mockPrisma.issue.findUnique.mockResolvedValue(
        sampleIssue({ id: CHILD_UUID, parentId: PARENT_UUID })
      )

      const res = await request(app)
        .post('/api/admin/issues')
        .set(authHeader())
        .send({ name: 'Deep', slug: 'deep', parentId: CHILD_UUID })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Cannot nest more than one level deep')
    })

    it('returns 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/api/admin/issues')
        .set(authHeader())
        .send({})
      expect(res.status).toBe(400)
    })

    it('returns 400 for invalid slug format', async () => {
      const res = await request(app)
        .post('/api/admin/issues')
        .set(authHeader())
        .send({ name: 'Test', slug: 'Invalid Slug!' })
      expect(res.status).toBe(400)
    })

    it('returns 409 for duplicate slug', async () => {
      mockPrisma.issue.create.mockRejectedValue({ code: 'P2002' })

      const res = await request(app)
        .post('/api/admin/issues')
        .set(authHeader())
        .send({ name: 'Test', slug: 'existing-slug' })
      expect(res.status).toBe(409)
    })

    it('accepts static content fields', async () => {
      mockPrisma.issue.create.mockResolvedValue(sampleIssue({
        intro: 'Intro text',
        evaluationIntro: 'Eval intro',
        evaluationCriteria: '["Criterion 1"]',
        makeADifference: '[{"label":"Link","url":"https://example.com"}]',
      }))

      const res = await request(app)
        .post('/api/admin/issues')
        .set(authHeader())
        .send({
          name: 'Test', slug: 'test',
          intro: 'Intro text',
          evaluationIntro: 'Eval intro',
          evaluationCriteria: ['Criterion 1'],
          makeADifference: [{ label: 'Link', url: 'https://example.com' }],
        })
      expect(res.status).toBe(201)
      expect(res.body.evaluationCriteria).toEqual(['Criterion 1'])
      expect(res.body.makeADifference).toEqual([{ label: 'Link', url: 'https://example.com' }])
    })
  })

  describe('PUT /api/admin/issues/:id', () => {
    it('updates an issue', async () => {
      const updated = sampleIssue({ name: 'Updated Name' })
      mockPrisma.issue.update.mockResolvedValue(updated)

      const res = await request(app)
        .put('/api/admin/issues/issue-1')
        .set(authHeader())
        .send({ name: 'Updated Name' })
      expect(res.status).toBe(200)
      expect(res.body.name).toBe('Updated Name')
    })

    it('returns 400 when setting parent on issue with children', async () => {
      mockPrisma.issue.findUnique.mockResolvedValue(sampleIssue({ id: PARENT_UUID, parentId: null }))
      mockPrisma.issue.count.mockResolvedValue(2) // has 2 children

      const res = await request(app)
        .put(`/api/admin/issues/${ISSUE_UUID}`)
        .set(authHeader())
        .send({ parentId: PARENT_UUID })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Cannot set parent on an issue that has children')
    })

    it('returns 400 when setting self as parent', async () => {
      const res = await request(app)
        .put(`/api/admin/issues/${ISSUE_UUID}`)
        .set(authHeader())
        .send({ parentId: ISSUE_UUID })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('An issue cannot be its own parent')
    })

    it('returns 404 for unknown issue', async () => {
      mockPrisma.issue.update.mockRejectedValue({ code: 'P2025' })

      const res = await request(app)
        .put('/api/admin/issues/unknown')
        .set(authHeader())
        .send({ name: 'Test' })
      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /api/admin/issues/:id', () => {
    it('deletes an issue', async () => {
      mockPrisma.feed.count.mockResolvedValue(0)
      mockPrisma.issue.count.mockResolvedValue(0)
      mockPrisma.issue.delete.mockResolvedValue(sampleIssue())

      const res = await request(app)
        .delete('/api/admin/issues/issue-1')
        .set(authHeader())
      expect(res.status).toBe(204)
    })

    it('returns 409 when issue has feeds', async () => {
      mockPrisma.feed.count.mockResolvedValue(3)
      mockPrisma.issue.count.mockResolvedValue(0)

      const res = await request(app)
        .delete('/api/admin/issues/issue-1')
        .set(authHeader())
      expect(res.status).toBe(409)
      expect(res.body.error).toBe('Cannot delete issue with existing feeds')
    })

    it('returns 409 when issue has child issues', async () => {
      mockPrisma.feed.count.mockResolvedValue(0)
      mockPrisma.issue.count.mockResolvedValue(2)

      const res = await request(app)
        .delete('/api/admin/issues/issue-1')
        .set(authHeader())
      expect(res.status).toBe(409)
      expect(res.body.error).toBe('Cannot delete issue with child issues')
    })
  })
})
