import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAxiosInstance = {
  post: vi.fn(),
  get: vi.fn(),
  patch: vi.fn(),
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
      mockAxiosInstance.post.mockResolvedValue({ data: { id: 'campaign-1', name: 'Test', status: 'DRAFT' } })

      const result = await createCampaign({
        name: 'Test',
        subject: 'Subject',
        body: '<h1>Hello</h1>',
        audienceType: 'ALL',
      })

      expect(result).toEqual({ id: 'campaign-1', name: 'Test', status: 'DRAFT' })
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/campaigns',
        expect.objectContaining({ name: 'Test', subject: 'Subject', audienceType: 'ALL' }),
      )
    })
  })

  describe('sendCampaign', () => {
    it('sends immediately when no scheduledFor', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: {} })
      await sendCampaign('campaign-1')
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/campaigns/campaign-1/send', {})
    })

    it('schedules send when scheduledFor is provided', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: {} })
      await sendCampaign('campaign-1', '2025-01-15T10:00:00Z')
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/campaigns/campaign-1/send', { scheduledFor: '2025-01-15T10:00:00Z' })
    })
  })


  describe('getCampaignStats', () => {
    it('returns campaign stats', async () => {
      const stats = { delivered: 100, opened: 50, clicked: 20, bounced: 2, complained: 0 }
      mockAxiosInstance.get.mockResolvedValue({ data: stats })

      const result = await getCampaignStats('campaign-1')
      expect(result).toEqual(stats)
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/campaigns/campaign-1/stats')
    })
  })

  describe('createContact', () => {
    it('creates a contact with email and subscribed status', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: { id: 'contact-1', email: 'test@example.com', subscribed: false } })

      const result = await createContact({ email: 'test@example.com', subscribed: false, data: { confirmToken: 'abc' } })
      expect(result.id).toBe('contact-1')
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/contacts', {
        email: 'test@example.com',
        subscribed: false,
        data: { confirmToken: 'abc' },
      })
    })
  })

  describe('updateContact', () => {
    it('updates a contact', async () => {
      mockAxiosInstance.patch.mockResolvedValue({ data: { id: 'contact-1', subscribed: true } })

      const result = await updateContact('contact-1', { subscribed: true })
      expect(result.subscribed).toBe(true)
    })
  })

  describe('verifyEmail', () => {
    it('calls POST /v1/verify and returns the result', async () => {
      const verifyResult = { valid: true, domainExists: true, isDisposable: false }
      mockAxiosInstance.post.mockResolvedValue({ data: verifyResult })

      const result = await verifyEmail('test@example.com')

      expect(result).toEqual(verifyResult)
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/v1/verify', { email: 'test@example.com' })
    })

    it('propagates errors from the API', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('Network error'))

      await expect(verifyEmail('bad@example.com')).rejects.toThrow('Network error')
    })
  })

  describe('sendTransactional', () => {
    it('sends a transactional email', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: {} })
      await sendTransactional({ to: 'test@example.com', subject: 'Confirm', body: '<p>Confirm</p>' })
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/v1/send', expect.objectContaining({
        to: 'test@example.com',
        subject: 'Confirm',
      }))
    })
  })
})
