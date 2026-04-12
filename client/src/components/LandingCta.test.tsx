import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LandingCta from './LandingCta'

vi.mock('./SubscribeProvider', () => ({
  useSubscribe: () => ({ openSubscribe: vi.fn() }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'landing.readStories': "Read today's stories",
        'landing.subscribeNewsletter': 'Subscribe to newsletter',
      }
      return map[key] ?? key
    },
  }),
}))

function renderCta(props = { heading: 'Test Heading', description: 'Test description' }) {
  return render(
    <MemoryRouter>
      <LandingCta {...props} />
    </MemoryRouter>,
  )
}

describe('LandingCta', () => {
  it('renders heading and description', () => {
    renderCta()
    expect(screen.getByRole('heading', { name: 'Test Heading' })).toBeInTheDocument()
    expect(screen.getByText('Test description')).toBeInTheDocument()
  })

  it('renders both action buttons', () => {
    renderCta()
    expect(screen.getByRole('link', { name: /Read today's stories/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Subscribe to newsletter/ })).toBeInTheDocument()
  })

  it('links to homepage', () => {
    renderCta()
    const link = screen.getByRole('link', { name: /Read today's stories/ })
    expect(link.getAttribute('href')).toBe('/')
  })
})
