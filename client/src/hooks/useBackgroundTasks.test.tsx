import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import { ToastProvider } from '../components/ui/Toast'
import { BackgroundTaskProvider, useBackgroundTasks } from './useBackgroundTasks'

// Mock adminApi for polled task tests
vi.mock('../lib/admin-api', () => ({
  adminApi: {
    stories: {
      taskStatus: vi.fn(),
    },
  },
}))

function TestConsumer({ executor, label }: {
  executor: (report: (c: number, t: number) => void) => Promise<{ succeeded: number; failed: number }>
  label?: string
}) {
  const { launchTask, tasks } = useBackgroundTasks()
  return (
    <div>
      <button onClick={() => launchTask({
        id: 'test-task',
        label: label ?? 'Testing',
        executor,
        onComplete: () => {},
      })}>
        launch
      </button>
      <span data-testid="task-count">{tasks.length}</span>
      {tasks.map(t => (
        <span key={t.id} data-testid={`status-${t.id}`}>{t.status}</span>
      ))}
    </div>
  )
}

function renderTest(executor: (report: (c: number, t: number) => void) => Promise<{ succeeded: number; failed: number }>, label?: string) {
  return render(
    <ToastProvider>
      <BackgroundTaskProvider>
        <TestConsumer executor={executor} label={label} />
      </BackgroundTaskProvider>
    </ToastProvider>,
  )
}

describe('useBackgroundTasks', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('launches a task and shows progress toast', async () => {
    const executor = vi.fn().mockResolvedValue({ succeeded: 3, failed: 0 })
    renderTest(executor)

    fireEvent.click(screen.getByText('launch'))
    expect(screen.getByText('Testing...')).toBeInTheDocument()
    expect(executor).toHaveBeenCalledOnce()

    // Let the promise resolve
    await act(async () => {})
  })

  it('shows success toast on completion', async () => {
    let resolve: (v: { succeeded: number; failed: number }) => void
    const executor = vi.fn().mockImplementation(() => new Promise(r => { resolve = r }))
    renderTest(executor)

    fireEvent.click(screen.getByText('launch'))
    expect(screen.getByText('Testing...')).toBeInTheDocument()

    await act(async () => { resolve!({ succeeded: 5, failed: 0 }) })

    expect(screen.getByText('Testing: 5 completed')).toBeInTheDocument()
  })

  it('shows error toast when some items fail', async () => {
    let resolve: (v: { succeeded: number; failed: number }) => void
    const executor = vi.fn().mockImplementation(() => new Promise(r => { resolve = r }))
    renderTest(executor)

    fireEvent.click(screen.getByText('launch'))

    await act(async () => { resolve!({ succeeded: 3, failed: 2 }) })

    expect(screen.getByText('Testing: 3 succeeded, 2 failed')).toBeInTheDocument()
  })

  it('shows error toast when executor rejects', async () => {
    let reject: (e: Error) => void
    const executor = vi.fn().mockImplementation(() => new Promise((_, r) => { reject = r }))
    renderTest(executor)

    fireEvent.click(screen.getByText('launch'))

    await act(async () => { reject!(new Error('Network error')) })

    expect(screen.getByText('Testing: Network error')).toBeInTheDocument()
  })

  it('reports progress updates', async () => {
    let reportFn: (c: number, t: number) => void
    let resolve: (v: { succeeded: number; failed: number }) => void
    const executor = vi.fn().mockImplementation((report: (c: number, t: number) => void) => {
      reportFn = report
      return new Promise(r => { resolve = r })
    })
    renderTest(executor, 'Assessing 5 stories')

    fireEvent.click(screen.getByText('launch'))
    expect(screen.getByText('Assessing 5 stories...')).toBeInTheDocument()

    act(() => { reportFn!(2, 5) })
    expect(screen.getByText('Assessing 5 stories... 2/5')).toBeInTheDocument()

    act(() => { reportFn!(4, 5) })
    expect(screen.getByText('Assessing 5 stories... 4/5')).toBeInTheDocument()

    await act(async () => { resolve!({ succeeded: 5, failed: 0 }) })

    expect(screen.getByText('Assessing 5 stories: 5 completed')).toBeInTheDocument()
  })

  it('calls onComplete after task finishes', async () => {
    const onComplete = vi.fn()
    const executor = vi.fn().mockResolvedValue({ succeeded: 1, failed: 0 })

    render(
      <ToastProvider>
        <BackgroundTaskProvider>
          <TestOnComplete executor={executor} onComplete={onComplete} />
        </BackgroundTaskProvider>
      </ToastProvider>,
    )

    fireEvent.click(screen.getByText('launch-with-callback'))
    await act(async () => {})

    expect(onComplete).toHaveBeenCalledOnce()
  })

  it('cleans up task from registry after delay', async () => {
    vi.useFakeTimers()
    const executor = vi.fn().mockResolvedValue({ succeeded: 1, failed: 0 })
    renderTest(executor)

    fireEvent.click(screen.getByText('launch'))
    await act(async () => {})

    expect(screen.getByTestId('task-count').textContent).toBe('1')

    act(() => { vi.advanceTimersByTime(5000) })
    expect(screen.getByTestId('task-count').textContent).toBe('0')
    vi.useRealTimers()
  })
})

function TestOnComplete({ executor, onComplete }: {
  executor: (report: (c: number, t: number) => void) => Promise<{ succeeded: number; failed: number }>
  onComplete: () => void
}) {
  const { launchTask } = useBackgroundTasks()
  return (
    <button onClick={() => launchTask({
      id: 'cb-task',
      label: 'Callback test',
      executor,
      onComplete,
    })}>
      launch-with-callback
    </button>
  )
}

// --- launchPolledTask tests ---

function PolledTaskConsumer({ submitFn, onComplete, storyIds }: {
  submitFn: () => Promise<{ taskId: string }>
  onComplete?: () => void
  storyIds?: string[]
}) {
  const { launchPolledTask, tasks, processingIds } = useBackgroundTasks()
  return (
    <div>
      <button onClick={() => launchPolledTask({
        id: 'polled-task',
        label: 'Bulk assess',
        submitFn,
        onComplete,
        storyIds,
      })}>
        launch-polled
      </button>
      <span data-testid="task-count">{tasks.length}</span>
      <span data-testid="processing-count">{processingIds.size}</span>
      {tasks.map(t => (
        <span key={t.id} data-testid={`status-${t.id}`}>{t.status}</span>
      ))}
    </div>
  )
}

function renderPolledTest(
  submitFn: () => Promise<{ taskId: string }>,
  opts: { onComplete?: () => void; storyIds?: string[] } = {},
) {
  return render(
    <ToastProvider>
      <BackgroundTaskProvider>
        <PolledTaskConsumer submitFn={submitFn} {...opts} />
      </BackgroundTaskProvider>
    </ToastProvider>,
  )
}

describe('launchPolledTask', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('shows running state after submit', async () => {
    const submitFn = vi.fn().mockResolvedValue({ taskId: 'task-1' })
    const { adminApi } = await import('../lib/admin-api')
    vi.mocked(adminApi.stories.taskStatus).mockResolvedValue({
      id: 'task-1', type: 'assess', status: 'running',
      total: 3, completed: 1, failed: 0, errors: [], storyIds: ['s1', 's2', 's3'], createdAt: new Date().toISOString(),
    })

    renderPolledTest(submitFn, { storyIds: ['s1', 's2', 's3'] })

    await act(async () => { fireEvent.click(screen.getByText('launch-polled')) })

    expect(screen.getByText('Bulk assess...')).toBeInTheDocument()
    expect(screen.getByTestId('processing-count').textContent).toBe('3')
  })

  it('updates progress from poll response', async () => {
    const submitFn = vi.fn().mockResolvedValue({ taskId: 'task-1' })
    const { adminApi } = await import('../lib/admin-api')

    vi.mocked(adminApi.stories.taskStatus)
      .mockResolvedValueOnce({
        id: 'task-1', type: 'assess', status: 'running',
        total: 3, completed: 1, failed: 0, errors: [], storyIds: ['s1', 's2', 's3'], createdAt: new Date().toISOString(),
      })
      .mockResolvedValueOnce({
        id: 'task-1', type: 'assess', status: 'completed',
        total: 3, completed: 3, failed: 0, errors: [], storyIds: ['s1', 's2', 's3'],
        createdAt: new Date().toISOString(), completedAt: new Date().toISOString(),
      })

    const onComplete = vi.fn()
    renderPolledTest(submitFn, { onComplete, storyIds: ['s1', 's2', 's3'] })

    await act(async () => { fireEvent.click(screen.getByText('launch-polled')) })

    // First poll
    await act(async () => { vi.advanceTimersByTime(2000) })
    expect(screen.getByText('Bulk assess... 1/3')).toBeInTheDocument()

    // Second poll — task completed
    await act(async () => { vi.advanceTimersByTime(2000) })
    expect(screen.getByText('Bulk assess: 3 completed')).toBeInTheDocument()
    expect(onComplete).toHaveBeenCalledOnce()
    expect(screen.getByTestId('processing-count').textContent).toBe('0')
  })

  it('shows error when submit fails', async () => {
    const submitFn = vi.fn().mockRejectedValue(new Error('Server down'))

    renderPolledTest(submitFn, { storyIds: ['s1'] })

    await act(async () => { fireEvent.click(screen.getByText('launch-polled')) })

    expect(screen.getByText('Bulk assess: Server down')).toBeInTheDocument()
    expect(screen.getByTestId('processing-count').textContent).toBe('0')
  })

  it('shows error when task is lost on poll', async () => {
    const submitFn = vi.fn().mockResolvedValue({ taskId: 'task-1' })
    const { adminApi } = await import('../lib/admin-api')
    vi.mocked(adminApi.stories.taskStatus).mockRejectedValue(new Error('Not found'))

    const onComplete = vi.fn()
    renderPolledTest(submitFn, { onComplete, storyIds: ['s1'] })

    await act(async () => { fireEvent.click(screen.getByText('launch-polled')) })

    // First poll fails
    await act(async () => { vi.advanceTimersByTime(2000) })

    expect(screen.getByText('Bulk assess: Task lost (server may have restarted)')).toBeInTheDocument()
    expect(onComplete).toHaveBeenCalledOnce()
    expect(screen.getByTestId('processing-count').textContent).toBe('0')
  })
})

describe('processingIds', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('tracks processing IDs for launchTask', async () => {
    function ProcessingConsumer() {
      const { launchTask, processingIds } = useBackgroundTasks()
      return (
        <div>
          <button onClick={() => launchTask({
            id: 'task-1',
            label: 'Test',
            executor: async () => ({ succeeded: 1, failed: 0 }),
            storyIds: ['story-1', 'story-2'],
          })}>
            launch
          </button>
          <span data-testid="processing">{Array.from(processingIds).join(',')}</span>
        </div>
      )
    }

    render(
      <ToastProvider>
        <BackgroundTaskProvider>
          <ProcessingConsumer />
        </BackgroundTaskProvider>
      </ToastProvider>,
    )

    // Before launch — empty
    expect(screen.getByTestId('processing').textContent).toBe('')

    // Launch — IDs tracked while running, cleared after completion
    fireEvent.click(screen.getByText('launch'))
    expect(screen.getByTestId('processing').textContent).toBe('story-1,story-2')

    await act(async () => {})

    expect(screen.getByTestId('processing').textContent).toBe('')
  })
})
