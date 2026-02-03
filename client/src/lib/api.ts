import type { PublicStory, PaginatedResponse } from '@shared/types'

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
  hero: PublicStory | null
  storiesByIssue: Record<string, PublicStory[]>
}

export const publicApi = {
  homepage: () => request<HomepageData>('/homepage'),

  stories: {
    list: (params?: { page?: number; pageSize?: number; issueSlug?: string; search?: string }) =>
      request<PaginatedResponse<PublicStory>>(`/stories${toQueryString((params || {}) as Record<string, unknown>)}`),
    get: (slug: string) => request<PublicStory>(`/stories/${slug}`),
  },

  issues: {
    list: () => request<PublicIssue[]>(`/issues`),
    get: (slug: string) => request<PublicIssue>(`/issues/${slug}`),
  },

  subscribe: (data: { email: string; firstName?: string }) =>
    request<{ success: boolean; message: string }>('/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
}
