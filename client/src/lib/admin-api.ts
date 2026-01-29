import type {
  Story,
  Feed,
  Issue,
  Newsletter,
  Podcast,
  JobRun,
  StoryFilters,
  PaginatedResponse,
  StoryStatus,
} from '@shared/types'

const API_BASE = (import.meta.env.VITE_API_URL || '') + '/api/admin'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

function getAuthHeaders(): HeadersInit {
  const key = localStorage.getItem('admin_api_key')
  return {
    'Content-Type': 'application/json',
    ...(key ? { Authorization: `Bearer ${key}` } : {}),
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new ApiError(res.status, body.error || res.statusText)
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

async function requestBlob(path: string, options: RequestInit = {}): Promise<Blob> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new ApiError(res.status, body.error || res.statusText)
  }

  return res.blob()
}

function toQueryString(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value))
    }
  }
  const qs = searchParams.toString()
  return qs ? `?${qs}` : ''
}

export const adminApi = {
  // Auth
  validateKey: () => request<Record<string, number>>('/stories/stats'),

  // Stories
  stories: {
    stats: () => request<Record<string, number>>('/stories/stats'),
    list: (filters: StoryFilters = {}) =>
      request<PaginatedResponse<Story>>(`/stories${toQueryString(filters as Record<string, unknown>)}`),
    get: (id: string) => request<Story>(`/stories/${id}`),
    create: (data: Partial<Story>) => request<Story>('/stories', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Story>) =>
      request<Story>(`/stories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    updateStatus: (id: string, status: StoryStatus) =>
      request<Story>(`/stories/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
    bulkStatus: (ids: string[], status: StoryStatus) =>
      request<{ updated: number }>('/stories/bulk-status', { method: 'POST', body: JSON.stringify({ ids, status }) }),
    preassess: (storyIds?: string[]) =>
      request<{ processed: number }>('/stories/preassess', { method: 'POST', body: JSON.stringify({ storyIds }) }),
    assess: (id: string) => request<Story>(`/stories/${id}/assess`, { method: 'POST' }),
    select: (storyIds: string[]) =>
      request<{ selected: number }>('/stories/select', { method: 'POST', body: JSON.stringify({ storyIds }) }),
    publish: (id: string) => request<Story>(`/stories/${id}/publish`, { method: 'POST' }),
    reject: (id: string) => request<Story>(`/stories/${id}/reject`, { method: 'POST' }),
    delete: (id: string) => request<void>(`/stories/${id}`, { method: 'DELETE' }),
    crawlUrl: (url: string, feedId: string) =>
      request<Story>('/stories/crawl-url', { method: 'POST', body: JSON.stringify({ url, feedId }) }),
  },

  // Feeds
  feeds: {
    list: (params?: { issueId?: string; active?: boolean }) =>
      request<Feed[]>(`/feeds${toQueryString((params || {}) as Record<string, unknown>)}`),
    get: (id: string) => request<Feed>(`/feeds/${id}`),
    create: (data: Partial<Feed>) => request<Feed>('/feeds', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Feed>) =>
      request<Feed>(`/feeds/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/feeds/${id}`, { method: 'DELETE' }),
    crawl: (id: string) => request<{ crawled: number }>(`/feeds/${id}/crawl`, { method: 'POST' }),
    crawlAll: () => request<{ crawled: number }>('/feeds/crawl-all', { method: 'POST' }),
  },

  // Issues
  issues: {
    list: () => request<Issue[]>('/issues'),
    get: (id: string) => request<Issue>(`/issues/${id}`),
    create: (data: Partial<Issue>) => request<Issue>('/issues', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Issue>) =>
      request<Issue>(`/issues/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/issues/${id}`, { method: 'DELETE' }),
  },

  // Newsletters
  newsletters: {
    list: (params?: { status?: string }) =>
      request<Newsletter[]>(`/newsletters${toQueryString((params || {}) as Record<string, unknown>)}`),
    get: (id: string) => request<Newsletter>(`/newsletters/${id}`),
    create: (data: { title: string }) =>
      request<Newsletter>('/newsletters', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Newsletter>) =>
      request<Newsletter>(`/newsletters/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/newsletters/${id}`, { method: 'DELETE' }),
    assign: (id: string) => request<Newsletter>(`/newsletters/${id}/assign`, { method: 'POST' }),
    generate: (id: string) => request<Newsletter>(`/newsletters/${id}/generate`, { method: 'POST' }),
    carousel: (id: string) => requestBlob(`/newsletters/${id}/carousel`, { method: 'POST' }),
  },

  // Podcasts
  podcasts: {
    list: (params?: { status?: string }) =>
      request<Podcast[]>(`/podcasts${toQueryString((params || {}) as Record<string, unknown>)}`),
    get: (id: string) => request<Podcast>(`/podcasts/${id}`),
    create: (data: { title: string }) =>
      request<Podcast>('/podcasts', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Podcast>) =>
      request<Podcast>(`/podcasts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/podcasts/${id}`, { method: 'DELETE' }),
    assign: (id: string) => request<Podcast>(`/podcasts/${id}/assign`, { method: 'POST' }),
    generate: (id: string) => request<Podcast>(`/podcasts/${id}/generate`, { method: 'POST' }),
  },

  // Jobs
  jobs: {
    list: () => request<JobRun[]>('/jobs'),
    update: (jobName: string, data: Partial<JobRun>) =>
      request<JobRun>(`/jobs/${jobName}`, { method: 'PUT', body: JSON.stringify(data) }),
    run: (jobName: string) =>
      request<{ message: string }>(`/jobs/${jobName}/run`, { method: 'POST' }),
  },
}
