import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BulkActionsBar } from './BulkActionsBar'

describe('BulkActionsBar', () => {
  it('renders nothing when count is 0', () => {
    const { container } = render(
      <BulkActionsBar count={0} onAction={vi.fn()} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders selected count', () => {
    render(<BulkActionsBar count={3} onAction={vi.fn()} />)
    expect(screen.getByText('3 selected')).toBeInTheDocument()
  })

  it('renders Create Cluster button', () => {
    render(<BulkActionsBar count={3} onAction={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Create Cluster' })).toBeInTheDocument()
  })

  it('disables Create Cluster when count < 2', () => {
    render(<BulkActionsBar count={1} onAction={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Create Cluster' })).toBeDisabled()
  })

  it('enables Create Cluster when count >= 2', () => {
    render(<BulkActionsBar count={2} onAction={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Create Cluster' })).toBeEnabled()
  })

  it('calls onAction with create-cluster when clicked', async () => {
    const user = userEvent.setup()
    const onAction = vi.fn()
    render(<BulkActionsBar count={3} onAction={onAction} />)
    await user.click(screen.getByRole('button', { name: 'Create Cluster' }))
    expect(onAction).toHaveBeenCalledWith('create-cluster')
  })

  it('disables Create Cluster when loading', () => {
    render(<BulkActionsBar count={3} onAction={vi.fn()} loading />)
    expect(screen.getByRole('button', { name: 'Create Cluster' })).toBeDisabled()
  })

  it('shows "Post to Bluesky" when 1 story selected and all published', () => {
    render(<BulkActionsBar count={1} onAction={vi.fn()} allPublished />)
    expect(screen.getByRole('button', { name: 'Post to Bluesky' })).toBeInTheDocument()
  })

  it('shows "Pick Best for Bluesky" when multiple stories selected and all published', () => {
    render(<BulkActionsBar count={3} onAction={vi.fn()} allPublished />)
    expect(screen.getByRole('button', { name: 'Pick Best for Bluesky' })).toBeInTheDocument()
  })

  it('disables Bluesky button when not all published', () => {
    render(<BulkActionsBar count={1} onAction={vi.fn()} allPublished={false} />)
    expect(screen.getByRole('button', { name: 'Post to Bluesky' })).toBeDisabled()
  })

  it('calls onAction with bluesky-post for single story', async () => {
    const user = userEvent.setup()
    const onAction = vi.fn()
    render(<BulkActionsBar count={1} onAction={onAction} allPublished />)
    await user.click(screen.getByRole('button', { name: 'Post to Bluesky' }))
    expect(onAction).toHaveBeenCalledWith('bluesky-post')
  })

  it('calls onAction with bluesky-pick for multiple stories', async () => {
    const user = userEvent.setup()
    const onAction = vi.fn()
    render(<BulkActionsBar count={3} onAction={onAction} allPublished />)
    await user.click(screen.getByRole('button', { name: 'Pick Best for Bluesky' }))
    expect(onAction).toHaveBeenCalledWith('bluesky-pick')
  })

  it('disables Bluesky button when single story already has a post', () => {
    render(<BulkActionsBar count={1} onAction={vi.fn()} allPublished singleHasBlueskyPost />)
    expect(screen.getByRole('button', { name: 'Post to Bluesky' })).toBeDisabled()
  })

  it('does not disable Bluesky pick button for multiple stories regardless of singleHasBlueskyPost', () => {
    render(<BulkActionsBar count={3} onAction={vi.fn()} allPublished singleHasBlueskyPost />)
    expect(screen.getByRole('button', { name: 'Pick Best for Bluesky' })).toBeEnabled()
  })
})
