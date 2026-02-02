import axios from 'axios'
import { config } from '../config.js'
import { withRetry, isRetryableError } from '../lib/retry.js'
import { createLogger } from '../lib/logger.js'

const log = createLogger('plunk')

const client = axios.create({
  baseURL: config.plunk.baseUrl,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.request.use((cfg) => {
  cfg.headers.Authorization = `Bearer ${config.plunk.secretKey}`
  return cfg
})

// Plunk "next" API wraps responses in { success, data }; unwrap automatically
client.interceptors.response.use((res) => {
  if (res.data && typeof res.data === 'object' && 'success' in res.data && 'data' in res.data) {
    res.data = res.data.data
  }
  return res
})

// --- Campaign types ---

export interface CreateCampaignOpts {
  name: string
  subject: string
  body: string
  from?: string
  fromName?: string
  audienceType: 'ALL' | 'SEGMENT' | 'FILTERED'
  segmentId?: string
}

export interface Campaign {
  id: string
  name: string
  subject: string
  type: string
  status: string
  scheduledAt: string | null
}

export interface CampaignStats {
  delivered: number
  opened: number
  clicked: number
  bounced: number
  complained: number
}

// --- Contact types ---

export interface CreateContactOpts {
  email: string
  subscribed: boolean
  data?: Record<string, string | number | boolean>
}

export interface Contact {
  id: string
  email: string
  subscribed: boolean
  data: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

// --- Campaign methods ---

export async function createCampaign(opts: CreateCampaignOpts): Promise<Campaign> {
  return withRetry(
    async () => {
      log.info({ name: opts.name, audienceType: opts.audienceType }, 'creating campaign')
      const { data } = await client.post('/campaigns', {
        ...opts,
        from: opts.from || config.plunk.fromEmail,
        fromName: opts.fromName || config.plunk.fromName,
      })
      log.info({ campaignId: data.id }, 'campaign created')
      return data
    },
    { retries: 3, retryOn: isRetryableError },
  )
}

export async function updateCampaign(id: string, opts: Partial<CreateCampaignOpts>): Promise<Campaign> {
  return withRetry(
    async () => {
      const { data } = await client.patch(`/campaigns/${id}`, opts)
      return data
    },
    { retries: 3, retryOn: isRetryableError },
  )
}

export async function sendCampaign(id: string, scheduledFor?: string): Promise<void> {
  return withRetry(
    async () => {
      log.info({ campaignId: id, scheduledFor }, 'sending campaign')
      const body = scheduledFor ? { scheduledFor } : {}
      await client.post(`/campaigns/${id}/send`, body)
      log.info({ campaignId: id }, 'campaign send triggered')
    },
    { retries: 3, retryOn: isRetryableError },
  )
}


export async function getCampaignStats(id: string): Promise<CampaignStats> {
  return withRetry(
    async () => {
      const { data } = await client.get(`/campaigns/${id}/stats`)
      return data
    },
    { retries: 3, retryOn: isRetryableError },
  )
}

export async function listCampaigns(): Promise<Campaign[]> {
  return withRetry(
    async () => {
      const { data } = await client.get('/campaigns')
      return data
    },
    { retries: 3, retryOn: isRetryableError },
  )
}

// --- Contact methods ---

export async function createContact(opts: CreateContactOpts): Promise<Contact> {
  return withRetry(
    async () => {
      log.info({ email: opts.email, subscribed: opts.subscribed }, 'creating contact')
      const { data } = await client.post('/contacts', opts)
      log.info({ contactId: data.id }, 'contact created')
      return data
    },
    { retries: 3, retryOn: isRetryableError },
  )
}

export async function updateContact(id: string, updates: Partial<CreateContactOpts>): Promise<Contact> {
  return withRetry(
    async () => {
      const { data } = await client.patch(`/contacts/${id}`, updates)
      return data
    },
    { retries: 3, retryOn: isRetryableError },
  )
}

export async function getContact(id: string): Promise<Contact> {
  return withRetry(
    async () => {
      const { data } = await client.get(`/contacts/${id}`)
      return data
    },
    { retries: 3, retryOn: isRetryableError },
  )
}

export async function deleteContact(id: string): Promise<void> {
  return withRetry(
    async () => {
      await client.delete(`/contacts/${id}`)
    },
    { retries: 3, retryOn: isRetryableError },
  )
}

export async function listContacts(cursor?: string, limit = 50): Promise<{ items: Contact[]; nextCursor: string | null; hasMore: boolean; total: number }> {
  return withRetry(
    async () => {
      const params: Record<string, string | number> = { limit }
      if (cursor) params.cursor = cursor
      const { data } = await client.get('/contacts', { params })
      return data
    },
    { retries: 3, retryOn: isRetryableError },
  )
}

// --- Transactional ---

export interface SendTransactionalOpts {
  to: string
  subject: string
  body: string
  from?: string
  name?: string
}

export async function sendTransactional(opts: SendTransactionalOpts): Promise<void> {
  return withRetry(
    async () => {
      log.info({ to: opts.to, subject: opts.subject }, 'sending transactional email')
      await client.post('/v1/send', {
        to: opts.to,
        subject: opts.subject,
        body: opts.body,
        from: opts.from || config.plunk.fromEmail,
        name: opts.name || config.plunk.fromName,
      })
      log.info({ to: opts.to }, 'transactional email sent')
    },
    { retries: 3, retryOn: isRetryableError },
  )
}

// --- Event tracking ---

export async function trackEvent(email: string, event: string, data?: Record<string, unknown>): Promise<void> {
  return withRetry(
    async () => {
      log.debug({ email, event }, 'tracking event')
      await client.post('/v1/track', { email, event, data })
    },
    { retries: 3, retryOn: isRetryableError },
  )
}
