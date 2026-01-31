import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChunkErrorBoundary } from './ChunkErrorBoundary'

function ThrowingComponent({ error }: { error: Error }): never {
  throw error
}

describe('ChunkErrorBoundary', () => {
  beforeEach(() => {
    // Suppress React error boundary console output
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('renders children when no error', () => {
    render(
      <ChunkErrorBoundary>
        <p>Content</p>
      </ChunkErrorBoundary>,
    )
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('shows error UI when a child throws', () => {
    render(
      <ChunkErrorBoundary>
        <ThrowingComponent error={new Error('chunk failed')} />
      </ChunkErrorBoundary>,
    )
    expect(screen.getByText('Failed to load page')).toBeInTheDocument()
    expect(screen.getByText(/newer version/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeInTheDocument()
  })

  it('calls window.location.reload when reload button is clicked', async () => {
    const reloadMock = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload: reloadMock },
      writable: true,
    })

    render(
      <ChunkErrorBoundary>
        <ThrowingComponent error={new Error('chunk failed')} />
      </ChunkErrorBoundary>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Reload page' }))
    expect(reloadMock).toHaveBeenCalled()
  })
})
