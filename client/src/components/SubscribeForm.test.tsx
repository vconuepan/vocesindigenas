import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SubscribeForm from './SubscribeForm'

const mockSubscribe = vi.fn()

vi.mock('../lib/api', () => ({
  publicApi: {
    subscribe: (...args: unknown[]) => mockSubscribe(...args),
  },
}))

vi.mock('../i18n', () => ({
  default: { language: 'en' },
}))

vi.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: () => {} },
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'subscribe.namePlaceholder': 'Name (optional)',
        'subscribe.nameLabel': 'Name (optional)',
        'subscribe.emailPlaceholder': 'your@email.com',
        'subscribe.emailLabel': 'Email address',
        'subscribe.submit': 'Subscribe',
        'subscribe.submitting': 'Subscribing...',
        'subscribe.successTitle': 'Check your email',
        'subscribe.successMessage': 'We sent a confirmation link to {{email}}. Click the link to start receiving our weekly newsletter.',
        'subscribe.done': 'Done',
        'subscribe.error': 'Something went wrong. Please try again.',
      }
      return map[key] ?? key
    },
  }),
}))

describe('SubscribeForm', () => {
  beforeEach(() => {
    mockSubscribe.mockReset()
  })

  it('renders the form with first name and email fields', () => {
    render(<SubscribeForm idPrefix="test" />)

    expect(screen.getByPlaceholderText('Name (optional)')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('your@email.com')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /subscribe/i })).toBeInTheDocument()
  })

  it('submits and shows success message', async () => {
    mockSubscribe.mockResolvedValue({ success: true, message: 'ok' })
    const user = userEvent.setup()

    render(<SubscribeForm idPrefix="test" />)

    await user.type(screen.getByPlaceholderText('your@email.com'), 'hello@example.com')
    await user.click(screen.getByRole('button', { name: /subscribe/i }))

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument()
    })
    expect(mockSubscribe).toHaveBeenCalledWith({ email: 'hello@example.com', language: 'en' })
  })

  it('shows error message on failure', async () => {
    mockSubscribe.mockResolvedValue({ success: false, message: 'Invalid email address' })
    const user = userEvent.setup()

    render(<SubscribeForm idPrefix="test" />)

    await user.type(screen.getByPlaceholderText('your@email.com'), 'bad@example.com')
    await user.click(screen.getByRole('button', { name: /subscribe/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid email address')
    })
  })

  it('shows generic error on network failure', async () => {
    mockSubscribe.mockRejectedValue(new Error('Network error'))
    const user = userEvent.setup()

    render(<SubscribeForm idPrefix="test" />)

    await user.type(screen.getByPlaceholderText('your@email.com'), 'test@example.com')
    await user.click(screen.getByRole('button', { name: /subscribe/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong')
    })
  })

  it('renders Done button when onSuccess is provided', async () => {
    mockSubscribe.mockResolvedValue({ success: true, message: 'ok' })
    const onSuccess = vi.fn()
    const user = userEvent.setup()

    render(<SubscribeForm idPrefix="test" onSuccess={onSuccess} />)

    await user.type(screen.getByPlaceholderText('your@email.com'), 'test@example.com')
    await user.click(screen.getByRole('button', { name: /subscribe/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /done/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /done/i }))
    expect(onSuccess).toHaveBeenCalled()
  })

  it('hides heading when hideHeading is true', () => {
    render(<SubscribeForm idPrefix="test" hideHeading />)

    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })

  it('shows heading by default', () => {
    render(<SubscribeForm idPrefix="test" />)

    expect(screen.getByRole('heading')).toBeInTheDocument()
  })

  it('includes firstName when provided', async () => {
    mockSubscribe.mockResolvedValue({ success: true, message: 'ok' })
    const user = userEvent.setup()

    render(<SubscribeForm idPrefix="test" />)

    await user.type(screen.getByPlaceholderText('Name (optional)'), 'Alice')
    await user.type(screen.getByPlaceholderText('your@email.com'), 'alice@example.com')
    await user.click(screen.getByRole('button', { name: /subscribe/i }))

    await waitFor(() => {
      expect(mockSubscribe).toHaveBeenCalledWith({
        email: 'alice@example.com',
        firstName: 'Alice',
        language: 'en',
      })
    })
  })

  it('disables submit button while loading', async () => {
    mockSubscribe.mockReturnValue(new Promise(() => {})) // never resolves
    const user = userEvent.setup()

    render(<SubscribeForm idPrefix="test" />)

    await user.type(screen.getByPlaceholderText('your@email.com'), 'test@example.com')
    await user.click(screen.getByRole('button', { name: /subscribe/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /subscribing/i })).toBeDisabled()
    })
  })
})
