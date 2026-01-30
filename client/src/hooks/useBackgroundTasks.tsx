import { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from 'react'
import type { ReactNode } from 'react'
import { useToast } from '../components/ui/Toast'

interface TaskProgress {
  current: number
  total: number
}

type TaskStatus = 'running' | 'success' | 'error'

interface BackgroundTask {
  id: string
  label: string
  status: TaskStatus
  progress: TaskProgress | null
}

type TaskExecutor = (
  reportProgress: (current: number, total: number) => void,
) => Promise<{ succeeded: number; failed: number }>

interface LaunchTaskOptions {
  id: string
  label: string
  executor: TaskExecutor
  onComplete?: () => void
}

interface BackgroundTaskContextValue {
  tasks: BackgroundTask[]
  launchTask: (options: LaunchTaskOptions) => void
  hasRunningTasks: boolean
}

const BackgroundTaskContext = createContext<BackgroundTaskContextValue | null>(null)

export function BackgroundTaskProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<BackgroundTask[]>([])
  const { addProgressToast, updateToast } = useToast()
  const cleanupTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    const timers = cleanupTimersRef.current
    return () => {
      timers.forEach(timer => clearTimeout(timer))
      timers.clear()
    }
  }, [])

  const launchTask = useCallback(({ id, label, executor, onComplete }: LaunchTaskOptions) => {
    setTasks(prev => [...prev, { id, label, status: 'running', progress: null }])
    addProgressToast(id, `${label}...`)

    const reportProgress = (current: number, total: number) => {
      setTasks(prev => prev.map(t =>
        t.id === id ? { ...t, progress: { current, total } } : t,
      ))
      updateToast(id, { message: `${label}... ${current}/${total}` })
    }

    executor(reportProgress)
      .then(({ succeeded, failed }) => {
        const finalStatus: TaskStatus = failed > 0 ? 'error' : 'success'
        const finalMessage = failed > 0
          ? `${label}: ${succeeded} succeeded, ${failed} failed`
          : `${label}: ${succeeded} completed`

        setTasks(prev => prev.map(t =>
          t.id === id ? { ...t, status: finalStatus } : t,
        ))
        updateToast(id, { type: finalStatus, message: finalMessage })
        onComplete?.()
      })
      .catch((err: unknown) => {
        setTasks(prev => prev.map(t =>
          t.id === id ? { ...t, status: 'error' } : t,
        ))
        updateToast(id, {
          type: 'error',
          message: `${label}: ${err instanceof Error ? err.message : 'Failed'}`,
        })
        onComplete?.()
      })
      .finally(() => {
        const timer = setTimeout(() => {
          setTasks(prev => prev.filter(t => t.id !== id))
          cleanupTimersRef.current.delete(id)
        }, 5000)
        cleanupTimersRef.current.set(id, timer)
      })
  }, [addProgressToast, updateToast])

  const hasRunningTasks = useMemo(() => tasks.some(t => t.status === 'running'), [tasks])

  const value = useMemo(() => ({
    tasks, launchTask, hasRunningTasks,
  }), [tasks, launchTask, hasRunningTasks])

  return (
    <BackgroundTaskContext.Provider value={value}>
      {children}
    </BackgroundTaskContext.Provider>
  )
}

export function useBackgroundTasks(): BackgroundTaskContextValue {
  const ctx = useContext(BackgroundTaskContext)
  if (!ctx) throw new Error('useBackgroundTasks must be used within BackgroundTaskProvider')
  return ctx
}
