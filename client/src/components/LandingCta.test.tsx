import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LandingCta from './LandingCta'

vi.mock('./SubscribeProvider', () => ({
  useSubscribe: () => ({ openSubscribe: vi.fn() }),
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
    expect(screen.getByRole('button', { name: /Subscribe to the newsletter/ })).toBeInTheDocument()
  })

  it('links to homepage', () => {
    renderCta()
    const link = screen.getByRole('link', { name: /Read today's stories/ })
    expect(link.getAttribute('href')).toBe('/')
  })
})
