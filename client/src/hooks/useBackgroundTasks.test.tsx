import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import { ToastProvider } from '../components/ui/Toast'
import { BackgroundTaskProvider, useBackgroundTasks } from './useBackgroundTasks'

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
