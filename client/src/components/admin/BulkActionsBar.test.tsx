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
})
