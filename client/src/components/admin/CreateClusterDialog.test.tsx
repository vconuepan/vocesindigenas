import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '../ui/Toast'
import { CreateClusterDialog } from './CreateClusterDialog'
import type { Story } from '@shared/types'

function makeStory(overrides: Partial<Story> = {}): Story {
  return {
    id: overrides.id ?? '1',
    title: overrides.title ?? 'Test Story',
    sourceTitle: 'Source Title',
    status: 'analyzed',
    dateCrawled: '2025-01-15T00:00:00Z',
    relevance: 7,
    relevancePre: null,
    emotionTag: null,
    clusterId: null,
    ...overrides,
  } as Story
}

function renderDialog(props: Partial<React.ComponentProps<typeof CreateClusterDialog>> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    stories: [
      makeStory({ id: 's1', title: 'Story One' }),
      makeStory({ id: 's2', title: 'Story Two' }),
    ],
    onSuccess: vi.fn(),
    ...props,
  }
  return render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <CreateClusterDialog {...defaultProps} />
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('CreateClusterDialog', () => {
  it('renders title and stories', () => {
    renderDialog()
    expect(screen.getByRole('heading', { name: 'Create Cluster' })).toBeInTheDocument()
    expect(screen.getByText('Story One')).toBeInTheDocument()
    expect(screen.getByText('Story Two')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    renderDialog({ open: false })
    expect(screen.queryByText('Create Cluster')).not.toBeInTheDocument()
  })

  it('shows conflict warning for already-clustered stories', () => {
    renderDialog({
      stories: [
        makeStory({ id: 's1', title: 'Story One' }),
        makeStory({ id: 's2', title: 'Conflicting Story', clusterId: 'existing-cluster' }),
      ],
    })
    expect(screen.getByText('Some stories are already in a cluster:')).toBeInTheDocument()
    expect(screen.getByText(/Remove these stories/)).toBeInTheDocument()
    // The story name appears in both the warning and the list
    expect(screen.getAllByText('Conflicting Story')).toHaveLength(2)
  })

  it('disables Create button when stories have conflicts', () => {
    renderDialog({
      stories: [
        makeStory({ id: 's1', title: 'Story One' }),
        makeStory({ id: 's2', title: 'Conflicting Story', clusterId: 'existing-cluster' }),
      ],
    })
    expect(screen.getByRole('button', { name: 'Create Cluster' })).toBeDisabled()
  })

  it('enables Create button when 2+ valid stories and primary selected', () => {
    renderDialog()
    // First story is auto-selected as primary
    expect(screen.getByRole('button', { name: 'Create Cluster' })).toBeEnabled()
  })

  it('allows switching primary story', async () => {
    const user = userEvent.setup()
    renderDialog()

    // Find the "Make primary" button for the second story
    const makePrimaryButtons = screen.getAllByTitle('Make primary')
    expect(makePrimaryButtons).toHaveLength(1) // Only non-primary story has the button
    await user.click(makePrimaryButtons[0])

    // Now the second story should be primary
    expect(screen.getByTitle('Primary story')).toBeInTheDocument()
  })

  it('calls onClose when Cancel is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderDialog({ onClose })
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('disables Create button with fewer than 2 stories', () => {
    renderDialog({
      stories: [makeStory({ id: 's1', title: 'Solo Story' })],
    })
    expect(screen.getByRole('button', { name: 'Create Cluster' })).toBeDisabled()
  })
})
