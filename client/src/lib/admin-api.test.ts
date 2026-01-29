import { describe, it, expect, vi, beforeEach } from 'vitest'
import { adminApi, ApiError } from './admin-api'

const mockFetch = vi.fn()

beforeEach(() => {
  mockFetch.mockReset()
  vi.stubGlobal('fetch', mockFetch)
  localStorage.clear()
  localStorage.setItem('admin_api_key', 'test-key')
})

function jsonResponse(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: 'OK',
    json: () => Promise.resolve(data),
  })
}

describe('adminApi', () => {
  it('sends Authorization header from localStorage', async () => {
    mockFetch.mockReturnValueOnce(jsonResponse({ fetched: 5 }))
    await adminApi.stories.stats()
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/admin/stories/stats'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key',
        }),
      }),
    )
  })

  it('throws ApiError on non-OK response', async () => {
    mockFetch.mockReturnValue(
      Promise.resolve({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ error: 'Missing authorization header' }),
      }),
    )
    try {
      await adminApi.stories.stats()
      expect.unreachable('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError)
      expect((err as ApiError).status).toBe(401)
      expect((err as ApiError).message).toBe('Missing authorization header')
    }
  })

  it('builds query string for story list filters', async () => {
    mockFetch.mockReturnValueOnce(jsonResponse({ data: [], total: 0, page: 1, pageSize: 25, totalPages: 0 }))
    await adminApi.stories.list({ status: 'fetched', page: 2, pageSize: 10 })
    const url = mockFetch.mock.calls[0][0] as string
    expect(url).toContain('status=fetched')
    expect(url).toContain('page=2')
    expect(url).toContain('pageSize=10')
  })

  it('handles 204 response for delete', async () => {
    mockFetch.mockReturnValueOnce(
      Promise.resolve({
        ok: true,
        status: 204,
        json: () => Promise.reject(new Error('No content')),
      }),
    )
    const result = await adminApi.stories.delete('test-id')
    expect(result).toBeUndefined()
  })

  it('omits empty/null values from query string', async () => {
    mockFetch.mockReturnValueOnce(jsonResponse({ data: [], total: 0, page: 1, pageSize: 25, totalPages: 0 }))
    await adminApi.stories.list({ status: undefined, page: 1 })
    const url = mockFetch.mock.calls[0][0] as string
    expect(url).not.toContain('status')
    expect(url).toContain('page=1')
  })
})
