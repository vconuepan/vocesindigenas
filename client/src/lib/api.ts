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

export interface RegionStat {
  region: string
  label: string
  feedCount: number
  storyCount: number
  avgRelevance: number | null
}

export interface CoverageStats {
  periodDays: number
  since: string
  byRegion: RegionStat[]
  totalStories: number
  totalFeeds: number
}

export interface HomepageData {
  issues: PublicIssue[]
  storiesByIssue: Record<string, { uplifting: PublicStory[]; calm: PublicStory[]; negative: PublicStory[] }>
}

// --- Member auth helpers ---

const MEMBER_TOKEN_KEY = 'member_token'

export const memberAuth = {
  getToken(): string | null {
    return localStorage.getItem(MEMBER_TOKEN_KEY)
  },
  setToken(token: string): void {
    localStorage.setItem(MEMBER_TOKEN_KEY, token)
  },
  clearToken(): void {
    localStorage.removeItem(MEMBER_TOKEN_KEY)
  },
  isAuthenticated(): boolean {
    return !!localStorage.getItem(MEMBER_TOKEN_KEY)
  },
}

function memberRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const token = memberAuth.getToken()
  return request<T>(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
  })
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
    membership: (slug: string) =>
      memberRequest<{ isMember: boolean }>(`/communities/${slug}/membership`),
    join: (slug: string) =>
      memberRequest<{ isMember: boolean }>(`/communities/${slug}/join`, { method: 'POST' }),
    leave: (slug: string) =>
      memberRequest<{ isMember: boolean }>(`/communities/${slug}/leave`, { method: 'DELETE' }),
  },

  profile: {
    get: () => memberRequest<{ id: string; email: string; name: string; userType: string }>('/auth/me'),
    update: (name: string) =>
      memberRequest<{ name: string }>('/auth/me', {
        method: 'PUT',
        body: JSON.stringify({ name }),
      }),
    memberships: () =>
      memberRequest<{ communities: Array<{ id: string; slug: string; name: string; type: string }> }>('/auth/memberships'),
    digestExclusions: () =>
      memberRequest<{ excludedCommunityIds: string[] }>('/auth/digest-exclusions'),
    excludeDigest: (communityId: string) =>
      memberRequest<{ success: boolean }>(`/auth/digest-exclusions/${communityId}`, { method: 'POST' }),
    includeDigest: (communityId: string) =>
      memberRequest<{ success: boolean }>(`/auth/digest-exclusions/${communityId}`, { method: 'DELETE' }),
    subscriptionStatus: () =>
      memberRequest<{ subscribed: boolean; confirmedAt: string | null }>('/auth/subscription'),
    unsubscribe: () =>
      memberRequest<{ success: boolean }>('/auth/subscription', { method: 'DELETE' }),
  },

  auth: {
    requestMagicLink: (email: string, redirectTo?: string) =>
      request<void>(`/auth/magic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, redirectTo }),
      }),
    resendMagicLink: (email: string, redirectTo?: string) =>
      request<void>(`/auth/magic/resend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, redirectTo }),
      }),
  },

  sources: () =>
    request<{ byRegion: Record<string, string[]>; byIssue: Record<string, string[]>; totalCount: number }>('/sources'),

  coverage: () =>
    request<CoverageStats>('/coverage'),

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

  spotlight: () =>
    request<SpotlightResponse | null>('/spotlight'),

  contrast: () =>
    request<ContrastResponse>('/contrast'),
}

// ─── Spotlight types ──────────────────────────────────────────────────────────

export interface SpotlightStory {
  slug:          string | null
  title:         string | null
  titleLabel:    string | null
  imageUrl:      string | null
  datePublished: string | null
  issue:         { name: string; slug: string } | null
  source:        string | null
}

// ─── Contrast types ───────────────────────────────────────────────────────────

export interface ContrastOurItem {
  id: string
  title: string
  slug: string | null
  sourceTitle: string
  relevanceScore: number | null
  datePublished: string | null
  issueName: string | null
  issueSlug: string | null
}

export interface ContrastMainstreamItem {
  title: string
  url: string
  source: string | null
  datePublished: string | null
}

export interface ContrastResponse {
  our: ContrastOurItem[]
  mainstream: ContrastMainstreamItem[]
  generatedAt: string
}

export interface SpotlightResponse {
  spotlight: {
    id:       string
    label:    string
    startsAt: string | null
    endsAt:   string | null
  }
  stories: SpotlightStory[]
}
