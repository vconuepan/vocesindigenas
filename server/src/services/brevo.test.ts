import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAxiosInstance = {
  post: vi.fn(),
  get: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  },
}

vi.mock('axios', () => ({
  default: {
    create: () => mockAxiosInstance,
  },
}))

const mockResolveMx = vi.fn()
vi.mock('dns/promises', () => ({
  resolveMx: mockResolveMx,
}))

const {
  createCampaign,
  sendCampaign,
  getCampaignStats,
  createContact,
  updateContact,
  sendTransactional,
  verifyEmail,
} = await import('./brevo.js')

describe('Brevo API client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createCampaign', () => {
    it('creates a campaign and returns data', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: { id: 42 } })

      const result = await createCampaign({
        name: 'Test',
        subject: 'Subject',
        body: '<h1>Hello</h1>',
        audienceType: 'ALL',
      })

      expect(result).toMatchObject({ id: '42', name: 'Test', status: 'draft', type: 'classic' })
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/emailCampaigns',
        expect.objectContaining({ name: 'Test', subject: 'Subject', htmlContent: '<h1>Hello</h1>' }),
      )
    })
  })

  describe('sendCampaign', () => {
    it('sends immediately when no scheduledFor', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: {} })
      await sendCampaign('campaign-1')
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/emailCampaigns/campaign-1/sendNow')
      expect(mockAxiosInstance.put).not.toHaveBeenCalled()
    })

    it('schedules send when scheduledFor is provided', async () => {
      mockAxiosInstance.put.mockResolvedValue({ data: {} })
      mockAxiosInstance.post.mockResolvedValue({ data: {} })
      await sendCampaign('campaign-1', '2025-01-15T10:00:00Z')
      expect(mockAxiosInstance.put).toHaveBeenCalledWith(
        '/emailCampaigns/campaign-1',
        { scheduledAt: '2025-01-15T10:00:00Z' },
      )
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/emailCampaigns/campaign-1/sendNow')
    })
  })

  describe('getCampaignStats', () => {
    it('returns campaign stats', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          statistics: {
            campaignStats: {
              delivered: 100,
              uniqueViews: 50,
              uniqueClicks: 20,
              hardBounces: 1,
              softBounces: 1,
              unsubscriptions: 0,
            },
          },
        },
      })

      const result = await getCampaignStats('campaign-1')
      expect(result).toEqual({ delivered: 100, opened: 50, clicked: 20, bounced: 2, complained: 0 })
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/emailCampaigns/campaign-1')
    })
  })

  describe('createContact', () => {
    it('creates a contact with email and attributes', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: { id: 123 } })

      const result = await createContact({ email: 'test@example.com', subscribed: false, data: { confirmToken: 'abc' } })
      expect(result.id).toBe('123')
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/contacts', {
        email: 'test@example.com',
        attributes: { confirmToken: 'abc' },
      })
    })
  })

  describe('updateContact', () => {
    it('updates a contact via PUT', async () => {
      mockAxiosInstance.put.mockResolvedValue({ data: {} })

      const result = await updateContact('contact-1', { subscribed: true })
      expect(result.subscribed).toBe(true)
      expect(mockAxiosInstance.put).toHaveBeenCalledWith(
        '/contacts/contact-1',
        expect.objectContaining({ listIds: [2], unlinkListIds: [] }),
      )
    })
  })

  describe('verifyEmail', () => {
    it('returns valid=true when domain has MX records and is not disposable', async () => {
      mockResolveMx.mockResolvedValue([{ exchange: 'mx.example.com', priority: 10 }])

      const result = await verifyEmail('test@example.com')

      expect(result).toEqual({ valid: true, domainExists: true, isDisposable: false })
      expect(mockResolveMx).toHaveBeenCalledWith('example.com')
    })

    it('returns valid=false when MX lookup fails', async () => {
      mockResolveMx.mockRejectedValue(new Error('ENOTFOUND'))

      const result = await verifyEmail('bad@nonexistent.xyz')
      expect(result).toEqual({ valid: false, domainExists: false, isDisposable: false })
    })

    it('returns isDisposable=true for disposable domains', async () => {
      mockResolveMx.mockResolvedValue([{ exchange: 'mx.mailinator.com', priority: 10 }])

      const result = await verifyEmail('test@mailinator.com')
      expect(result.isDisposable).toBe(true)
      expect(result.valid).toBe(false)
    })
  })

  describe('sendTransactional', () => {
    it('sends a transactional email via /smtp/email', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: {} })
      await sendTransactional({ to: 'test@example.com', subject: 'Confirm', body: '<p>Confirm</p>' })
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/smtp/email', expect.objectContaining({
        to: [{ email: 'test@example.com' }],
        subject: 'Confirm',
        htmlContent: '<p>Confirm</p>',
      }))
    })
  })
})
