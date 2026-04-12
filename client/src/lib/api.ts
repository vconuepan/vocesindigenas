import type { PublicStory, PaginatedResponse, Community } from '@shared/types'

export const API_BASE = (import.meta.env.VITE_API_URL || '') + '/api'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, options)

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new ApiError(res.status, body.error || res.statusText)
  }

  return res.json()
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

export interface PublicIssue {
  id: string
  name: string
  slug: string
  description: string
  intro: string
  evaluationIntro: string
  evaluationCriteria: string[]
  sourceNames: string[]
  makeADifference: { label: string; url: string }[]
  parentId: string | null
  publishedStoryCount?: number
  children?: PublicIssue[]
  parent?: { id: string; name: string; slug: string } | null
}

export interface HomepageData {
  issues: PublicIssue[]
  storiesByIssue: Record<string, { uplifting: PublicStory[]; calm: PublicStory[]; negative: PublicStory[] }>
}

export const publicApi = {
  homepage: () => request<HomepageData>('/homepage'),

  stories: {
    list: (params?: { page?: number; pageSize?: number; issueSlug?: string; search?: string; emotionTags?: string }) =>
      request<PaginatedResponse<PublicStory>>(`/stories${toQueryString((params || {}) as Record<string, unknown>)}`),
    get: (slug: string) => request<PublicStory>(`/stories/${slug}`),
    related: (slug: string, limit = 4) =>
      request<PublicStory[]>(`/stories/${slug}/related?limit=${limit}`),
    cluster: (slug: string) =>
      request<{ sources: { feedTitle: string; sourceUrl: string }[] }>(`/stories/${slug}/cluster`),
  },

  issues: {
    list: () => request<PublicIssue[]>(`/issues`),
    get: (slug: string) => request<PublicIssue>(`/issues/${slug}`),
  },

  communities: {
    list: () => request<Community[]>(`/communities`),
    get: (slug: string) => request<Community>(`/communities/${slug}`),
    stories: (slug: string, params?: { page?: number; pageSize?: number }) =>
      request<PaginatedResponse<PublicStory>>(
        `/communities/${slug}/stories${toQueryString((params || {}) as Record<string, unknown>)}`
      ),
  },

  sources: () =>
    request<{ byRegion: Record<string, string[]>; byIssue: Record<string, string[]>; totalCount: number }>('/sources'),

  subscribe: (data: { email: string; firstName?: string; language?: string }) =>
    request<{ success: boolean; message: string }>('/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  submitFeedback: (data: { category: string; message: string; email?: string; website?: string }) =>
    request<{ success: boolean }>('/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
}
