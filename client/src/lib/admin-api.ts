import type {
  Story,
  StoryCluster,
  ClusterStorySearchResult,
  Feed,
  Issue,
  Newsletter,
  NewsletterSend,
  Podcast,
  JobRun,
  User,
  StoryFilters,
  PaginatedResponse,
  StoryStatus,
  CrawlResult,
  TaskState,
} from '@shared/types'

export interface FeedQualityMetrics {
  totalCrawled: number
  publishedCount: number
  publishRate: number
  avgRelevance: number | null
}

const API_BASE = (import.meta.env.VITE_API_URL || '') + '/api'
const ADMIN_BASE = `${API_BASE}/admin`
const AUTH_BASE = `${API_BASE}/auth`

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// In-memory access token (not localStorage — XSS-safe)
let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function getAccessToken(): string | null {
  return accessToken
}

function getAuthHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  }
}

let isRefreshing = false
let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  if (isRefreshing && refreshPromise) return refreshPromise

  isRefreshing = true
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${AUTH_BASE}/refresh`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) return null
      const data = await res.json()
      accessToken = data.accessToken
      return data.accessToken as string
    } catch {
      return null
    } finally {
      isRefreshing = false
      refreshPromise = null
    }
  })()

  return refreshPromise
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = path.startsWith('/auth') ? `${API_BASE}${path}` : `${ADMIN_BASE}${path}`

  let res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
  })

  // On 401, try refreshing the access token
  if (res.status === 401) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      res = await fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${newToken}`,
          ...(options.headers || {}),
        },
      })
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new ApiError(res.status, body.error || res.statusText)
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

async function requestBlob(path: string, options: RequestInit = {}): Promise<Blob> {
  let res = await fetch(`${ADMIN_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
  })

  // On 401, try refreshing the access token
  if (res.status === 401) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      res = await fetch(`${ADMIN_BASE}${path}`, {
        ...options,
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${newToken}`,
          ...(options.headers || {}),
        },
      })
    }
  }

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

// Auth API (public routes, no admin middleware)
export const authApi = {
  login: async (email: string, password: string) => {
    const res = await fetch(`${AUTH_BASE}/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Login failed' }))
      throw new ApiError(res.status, body.error || 'Login failed')
    }
    return res.json() as Promise<{
      accessToken: string
      user: { id: string; email: string; name: string; role: string }
    }>
  },

  refresh: refreshAccessToken,

  logout: async () => {
    try {
      await fetch(`${AUTH_BASE}/logout`, {
        method: 'POST',
        credentials: 'include',
      })
    } catch {
      // Ignore network errors on logout
    }
    accessToken = null
  },

  me: () => request<User>('/auth/me'),
}

export const adminApi = {
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
    dissolveCluster: (id: string) => request<Story>(`/stories/${id}/dissolve-cluster`, { method: 'POST' }),
    delete: (id: string) => request<void>(`/stories/${id}`, { method: 'DELETE' }),
    crawlUrl: (url: string, feedId: string) =>
      request<Story>('/stories/crawl-url', { method: 'POST', body: JSON.stringify({ url, feedId }) }),
    batch: (ids: string[]) =>
      request<Story[]>(`/stories/batch?ids=${ids.join(',')}`),
    bulkPreassess: (storyIds: string[]) =>
      request<{ taskId: string }>('/stories/bulk-preassess', { method: 'POST', body: JSON.stringify({ storyIds }) }),
    bulkReclassify: (storyIds: string[]) =>
      request<{ taskId: string }>('/stories/bulk-reclassify', { method: 'POST', body: JSON.stringify({ storyIds }) }),
    bulkAssess: (storyIds: string[]) =>
      request<{ taskId: string }>('/stories/bulk-assess', { method: 'POST', body: JSON.stringify({ storyIds }) }),
    bulkSelect: (storyIds: string[]) =>
      request<{ taskId: string }>('/stories/bulk-select', { method: 'POST', body: JSON.stringify({ storyIds }) }),
    taskStatus: (taskId: string) =>
      request<TaskState>(`/stories/tasks/${taskId}`),
    processing: () =>
      request<{ storyIds: string[] }>('/stories/processing'),
  },

  // Feeds
  feeds: {
    list: (params?: { issueId?: string; active?: boolean }) =>
      request<Feed[]>(`/feeds${toQueryString((params || {}) as Record<string, unknown>)}`),
    get: (id: string) => request<Feed>(`/feeds/${id}`),
    create: (data: Partial<Feed>) => request<Feed>('/feeds', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Feed>) =>
      request<Feed>(`/feeds/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<{ action: string; message: string }>(`/feeds/${id}`, { method: 'DELETE' }),
    crawl: (id: string) => request<CrawlResult>(`/feeds/${id}/crawl`, { method: 'POST' }),
    crawlAll: () => request<CrawlResult[]>('/feeds/crawl-all', { method: 'POST' }),
    fetchFavicon: (id: string) => request<{ success: boolean; message: string }>(`/feeds/${id}/favicon`, { method: 'POST' }),
    fetchAllFavicons: () => request<{ succeeded: number; failed: number; skipped: number; errors: string[] }>('/feeds/fetch-favicons', { method: 'POST' }),
    quality: () => request<Record<string, FeedQualityMetrics>>('/feeds/quality'),
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
      request<PaginatedResponse<Newsletter>>(`/newsletters${toQueryString((params || {}) as Record<string, unknown>)}`),
    get: (id: string) => request<Newsletter>(`/newsletters/${id}`),
    create: (data: { title: string }) =>
      request<Newsletter>('/newsletters', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Newsletter>) =>
      request<Newsletter>(`/newsletters/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/newsletters/${id}`, { method: 'DELETE' }),
    assign: (id: string) => request<Newsletter>(`/newsletters/${id}/assign`, { method: 'POST' }),
    select: (id: string) => request<Newsletter>(`/newsletters/${id}/select`, { method: 'POST' }),
    generate: (id: string) => request<Newsletter>(`/newsletters/${id}/generate`, { method: 'POST' }),
    carousel: (id: string) => requestBlob(`/newsletters/${id}/carousel`, { method: 'POST' }),
    generateHtml: (id: string) => request<{ html: string }>(`/newsletters/${id}/html`, { method: 'POST' }),
    sendTest: (id: string) => request<NewsletterSend>(`/newsletters/${id}/send-test`, { method: 'POST' }),
    sendLive: (id: string, scheduledFor?: string) =>
      request<NewsletterSend>(`/newsletters/${id}/send-live`, { method: 'POST', body: JSON.stringify({ scheduledFor }) }),
    listSends: (id: string) => request<NewsletterSend[]>(`/newsletters/${id}/sends`),
    refreshStats: (id: string, sendId: string) =>
      request<NewsletterSend>(`/newsletters/${id}/sends/${sendId}/refresh-stats`, { method: 'POST' }),
  },

  // Podcasts
  podcasts: {
    list: (params?: { status?: string }) =>
      request<PaginatedResponse<Podcast>>(`/podcasts${toQueryString((params || {}) as Record<string, unknown>)}`),
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

  // Clusters
  clusters: {
    list: () => request<StoryCluster[]>('/clusters'),
    get: (id: string) => request<StoryCluster>(`/clusters/${id}`),
    create: (storyIds: string[], primaryStoryId: string) =>
      request<StoryCluster>('/clusters', { method: 'POST', body: JSON.stringify({ storyIds, primaryStoryId }) }),
    searchStories: (q: string, limit?: number) =>
      request<ClusterStorySearchResult[]>(`/clusters/search-stories?q=${encodeURIComponent(q)}${limit ? `&limit=${limit}` : ''}`),
    setPrimary: (id: string, storyId: string) =>
      request<StoryCluster>(`/clusters/${id}/primary`, { method: 'PUT', body: JSON.stringify({ storyId }) }),
    removeMember: (id: string, storyId: string) =>
      request<StoryCluster | { dissolved: true }>(`/clusters/${id}/remove-member`, { method: 'POST', body: JSON.stringify({ storyId }) }),
    merge: (targetId: string, sourceId: string) =>
      request<StoryCluster>(`/clusters/${targetId}/merge`, { method: 'POST', body: JSON.stringify({ sourceId }) }),
    dissolve: (id: string) => request<void>(`/clusters/${id}`, { method: 'DELETE' }),
  },

  // Users
  users: {
    list: () => request<User[]>('/users'),
    get: (id: string) => request<User>(`/users/${id}`),
    create: (data: { email: string; name: string; password: string; role?: string }) =>
      request<User>('/users', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: { email?: string; name?: string; role?: string }) =>
      request<User>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/users/${id}`, { method: 'DELETE' }),
    resetPassword: (id: string, password: string) =>
      request<{ message: string }>(`/users/${id}/password`, {
        method: 'PUT',
        body: JSON.stringify({ password }),
      }),
  },
}

// Preserve access token across Vite HMR (dev only, tree-shaken in production)
if (import.meta.hot) {
  if (import.meta.hot.data?.accessToken) {
    accessToken = import.meta.hot.data.accessToken
  }
  import.meta.hot.dispose((data) => {
    data.accessToken = accessToken
  })
}
