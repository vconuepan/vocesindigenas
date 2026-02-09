import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { authHeader, TEST_API_KEY } from '../../test/helpers.js'

vi.mock('express-rate-limit', () => ({
  default: () => (_req: any, _res: any, next: any) => next(),
}))

const mockGetAllClusters = vi.hoisted(() => vi.fn())
const mockGetClusterById = vi.hoisted(() => vi.fn())
const mockCreateManualCluster = vi.hoisted(() => vi.fn())
const mockSearchStoriesForCluster = vi.hoisted(() => vi.fn())
const mockSetClusterPrimary = vi.hoisted(() => vi.fn())
const mockRemoveFromCluster = vi.hoisted(() => vi.fn())
const mockMergeClusters = vi.hoisted(() => vi.fn())
const mockDissolveCluster = vi.hoisted(() => vi.fn())

vi.mock('../../services/cluster.js', () => ({
  getAllClusters: mockGetAllClusters,
  getClusterById: mockGetClusterById,
  createManualCluster: mockCreateManualCluster,
  searchStoriesForCluster: mockSearchStoriesForCluster,
  setClusterPrimary: mockSetClusterPrimary,
  removeFromCluster: mockRemoveFromCluster,
  mergeClusters: mockMergeClusters,
  dissolveCluster: mockDissolveCluster,
}))

// Mock prisma to prevent real DB connections
vi.mock('../../lib/prisma.js', () => ({
  default: {
    $disconnect: vi.fn(),
    $queryRaw: vi.fn(),
  },
}))

process.env.PUBLIC_API_KEY = TEST_API_KEY

const { default: app } = await import('../../app.js')

// Valid UUIDs for Zod validation
const CLUSTER_ID = '00000000-0000-4000-8000-000000000001'
const STORY_ID_1 = '00000000-0000-4000-8000-000000000010'
const STORY_ID_2 = '00000000-0000-4000-8000-000000000020'
const CLUSTER_ID_2 = '00000000-0000-4000-8000-000000000002'

const sampleCluster = {
  id: CLUSTER_ID,
  primaryStoryId: STORY_ID_1,
  primaryStory: { id: STORY_ID_1, title: 'Test Article', sourceTitle: 'Test Source' },
  stories: [
    { id: STORY_ID_1, title: 'Test Article', sourceTitle: 'Test Source', status: 'analyzed', relevance: 7 },
    { id: STORY_ID_2, title: 'Duplicate Article', sourceTitle: 'Other Source', status: 'rejected', relevance: 5 },
  ],
  _count: { stories: 2 },
  createdAt: new Date('2024-01-01').toISOString(),
  updatedAt: new Date('2024-01-01').toISOString(),
}

describe('Admin Clusters API', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('GET /api/admin/clusters', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/admin/clusters')
      expect(res.status).toBe(401)
    })

    it('returns list of clusters', async () => {
      mockGetAllClusters.mockResolvedValue([sampleCluster])

      const res = await request(app)
        .get('/api/admin/clusters')
        .set(authHeader())
      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(1)
      expect(res.body[0].id).toBe(CLUSTER_ID)
    })
  })

  describe('GET /api/admin/clusters/:id', () => {
    it('returns 404 when cluster not found', async () => {
      mockGetClusterById.mockResolvedValue(null)

      const res = await request(app)
        .get('/api/admin/clusters/nonexistent')
        .set(authHeader())
      expect(res.status).toBe(404)
    })

    it('returns cluster detail', async () => {
      mockGetClusterById.mockResolvedValue(sampleCluster)

      const res = await request(app)
        .get(`/api/admin/clusters/${CLUSTER_ID}`)
        .set(authHeader())
      expect(res.status).toBe(200)
      expect(res.body.stories).toHaveLength(2)
    })
  })

  describe('PUT /api/admin/clusters/:id/primary', () => {
    it('returns 400 for invalid body', async () => {
      const res = await request(app)
        .put(`/api/admin/clusters/${CLUSTER_ID}/primary`)
        .set(authHeader())
        .send({})
      expect(res.status).toBe(400)
    })

    it('sets primary story', async () => {
      mockSetClusterPrimary.mockResolvedValue(sampleCluster)

      const res = await request(app)
        .put(`/api/admin/clusters/${CLUSTER_ID}/primary`)
        .set(authHeader())
        .send({ storyId: STORY_ID_2 })
      expect(res.status).toBe(200)
      expect(mockSetClusterPrimary).toHaveBeenCalledWith(CLUSTER_ID, STORY_ID_2)
    })

    it('returns 400 when story not in cluster', async () => {
      mockSetClusterPrimary.mockRejectedValue(new Error('Story is not a member of this cluster'))

      const res = await request(app)
        .put(`/api/admin/clusters/${CLUSTER_ID}/primary`)
        .set(authHeader())
        .send({ storyId: '00000000-0000-4000-8000-000000000099' })
      expect(res.status).toBe(400)
    })
  })

  describe('POST /api/admin/clusters/:id/remove-member', () => {
    it('removes member from cluster', async () => {
      mockRemoveFromCluster.mockResolvedValue(sampleCluster)

      const res = await request(app)
        .post(`/api/admin/clusters/${CLUSTER_ID}/remove-member`)
        .set(authHeader())
        .send({ storyId: STORY_ID_2 })
      expect(res.status).toBe(200)
      expect(mockRemoveFromCluster).toHaveBeenCalledWith(CLUSTER_ID, STORY_ID_2)
    })
  })

  describe('POST /api/admin/clusters/:id/merge', () => {
    it('returns 400 for invalid body', async () => {
      const res = await request(app)
        .post(`/api/admin/clusters/${CLUSTER_ID}/merge`)
        .set(authHeader())
        .send({})
      expect(res.status).toBe(400)
    })

    it('merges clusters', async () => {
      mockMergeClusters.mockResolvedValue(sampleCluster)

      const res = await request(app)
        .post(`/api/admin/clusters/${CLUSTER_ID}/merge`)
        .set(authHeader())
        .send({ sourceId: CLUSTER_ID_2 })
      expect(res.status).toBe(200)
      expect(mockMergeClusters).toHaveBeenCalledWith(CLUSTER_ID, CLUSTER_ID_2)
    })

    it('returns 400 for self-merge', async () => {
      mockMergeClusters.mockRejectedValue(new Error('Cannot merge a cluster with itself'))

      const res = await request(app)
        .post(`/api/admin/clusters/${CLUSTER_ID}/merge`)
        .set(authHeader())
        .send({ sourceId: CLUSTER_ID })
      expect(res.status).toBe(400)
    })
  })

  describe('DELETE /api/admin/clusters/:id', () => {
    it('dissolves cluster', async () => {
      mockDissolveCluster.mockResolvedValue(undefined)

      const res = await request(app)
        .delete(`/api/admin/clusters/${CLUSTER_ID}`)
        .set(authHeader())
      expect(res.status).toBe(204)
      expect(mockDissolveCluster).toHaveBeenCalledWith(CLUSTER_ID)
    })

    it('returns 404 when cluster not found', async () => {
      mockDissolveCluster.mockRejectedValue(new Error('Cluster not found'))

      const res = await request(app)
        .delete('/api/admin/clusters/nonexistent')
        .set(authHeader())
      expect(res.status).toBe(404)
    })
  })

  describe('POST /api/admin/clusters', () => {
    it('returns 400 for invalid body', async () => {
      const res = await request(app)
        .post('/api/admin/clusters')
        .set(authHeader())
        .send({ storyIds: ['not-a-uuid'] })
      expect(res.status).toBe(400)
    })

    it('returns 400 when fewer than 2 stories', async () => {
      const res = await request(app)
        .post('/api/admin/clusters')
        .set(authHeader())
        .send({ storyIds: [STORY_ID_1], primaryStoryId: STORY_ID_1 })
      expect(res.status).toBe(400)
    })

    it('creates cluster and returns 201', async () => {
      mockCreateManualCluster.mockResolvedValue(sampleCluster)

      const res = await request(app)
        .post('/api/admin/clusters')
        .set(authHeader())
        .send({ storyIds: [STORY_ID_1, STORY_ID_2], primaryStoryId: STORY_ID_1 })
      expect(res.status).toBe(201)
      expect(mockCreateManualCluster).toHaveBeenCalledWith(
        [STORY_ID_1, STORY_ID_2],
        STORY_ID_1,
      )
    })

    it('returns 409 when stories already clustered', async () => {
      const error = new Error('Stories already in a cluster: Test Article')
      ;(error as any).code = 'ALREADY_CLUSTERED'
      ;(error as any).storyIds = [STORY_ID_1]
      mockCreateManualCluster.mockRejectedValue(error)

      const res = await request(app)
        .post('/api/admin/clusters')
        .set(authHeader())
        .send({ storyIds: [STORY_ID_1, STORY_ID_2], primaryStoryId: STORY_ID_1 })
      expect(res.status).toBe(409)
      expect(res.body.storyIds).toEqual([STORY_ID_1])
    })

    it('returns 404 when stories not found', async () => {
      mockCreateManualCluster.mockRejectedValue(new Error('Stories not found: missing-id'))

      const res = await request(app)
        .post('/api/admin/clusters')
        .set(authHeader())
        .send({ storyIds: [STORY_ID_1, STORY_ID_2], primaryStoryId: STORY_ID_1 })
      expect(res.status).toBe(404)
    })
  })

  describe('GET /api/admin/clusters/search-stories', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/admin/clusters/search-stories?q=test')
      expect(res.status).toBe(401)
    })

    it('returns 400 without query parameter', async () => {
      const res = await request(app)
        .get('/api/admin/clusters/search-stories')
        .set(authHeader())
      expect(res.status).toBe(400)
    })

    it('searches stories', async () => {
      const stories = [
        { id: STORY_ID_1, title: 'Test Article', sourceTitle: 'Source', status: 'analyzed', relevance: 7, clusterId: null },
      ]
      mockSearchStoriesForCluster.mockResolvedValue(stories)

      const res = await request(app)
        .get('/api/admin/clusters/search-stories?q=test')
        .set(authHeader())
      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(1)
      expect(mockSearchStoriesForCluster).toHaveBeenCalledWith('test', 20)
    })

    it('passes custom limit', async () => {
      mockSearchStoriesForCluster.mockResolvedValue([])

      const res = await request(app)
        .get('/api/admin/clusters/search-stories?q=test&limit=5')
        .set(authHeader())
      expect(res.status).toBe(200)
      expect(mockSearchStoriesForCluster).toHaveBeenCalledWith('test', 5)
    })
  })
})
