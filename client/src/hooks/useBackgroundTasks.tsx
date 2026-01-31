import { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from 'react'
import type { ReactNode } from 'react'
import { useToast } from '../components/ui/Toast'
import { adminApi } from '../lib/admin-api'
import type { TaskState } from '@shared/types'

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
  storyIds?: string[]
}

interface LaunchPolledTaskOptions {
  id: string
  label: string
  submitFn: () => Promise<{ taskId: string }>
  onComplete?: () => void
  storyIds?: string[]
}

interface BackgroundTaskContextValue {
  tasks: BackgroundTask[]
  launchTask: (options: LaunchTaskOptions) => void
  launchPolledTask: (options: LaunchPolledTaskOptions) => void
  hasRunningTasks: boolean
  processingIds: Set<string>
}

const BackgroundTaskContext = createContext<BackgroundTaskContextValue | null>(null)

export function BackgroundTaskProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<BackgroundTask[]>([])
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())
  const { addProgressToast, updateToast } = useToast()
  const cleanupTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const addProcessingIds = useCallback((ids: string[]) => {
    if (ids.length === 0) return
    setProcessingIds(prev => {
      const next = new Set(prev)
      for (const id of ids) next.add(id)
      return next
    })
  }, [])

  const removeProcessingIds = useCallback((ids: string[]) => {
    if (ids.length === 0) return
    setProcessingIds(prev => {
      const next = new Set(prev)
      for (const id of ids) next.delete(id)
      return next
    })
  }, [])

  useEffect(() => {
    const timers = cleanupTimersRef.current
    return () => {
      timers.forEach(timer => clearTimeout(timer))
      timers.clear()
    }
  }, [])

  const launchTask = useCallback(({ id, label, executor, onComplete, storyIds = [] }: LaunchTaskOptions) => {
    setTasks(prev => [...prev, { id, label, status: 'running', progress: null }])
    addProgressToast(id, `${label}...`)
    addProcessingIds(storyIds)

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
        removeProcessingIds(storyIds)
        const timer = setTimeout(() => {
          setTasks(prev => prev.filter(t => t.id !== id))
          cleanupTimersRef.current.delete(id)
        }, 5000)
        cleanupTimersRef.current.set(id, timer)
      })
  }, [addProgressToast, updateToast, addProcessingIds, removeProcessingIds])

  const pollIntervalsRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map())

  useEffect(() => {
    const intervals = pollIntervalsRef.current
    return () => {
      intervals.forEach(interval => clearInterval(interval))
      intervals.clear()
    }
  }, [])

  const launchPolledTask = useCallback(({ id, label, submitFn, onComplete, storyIds = [] }: LaunchPolledTaskOptions) => {
    setTasks(prev => [...prev, { id, label, status: 'running', progress: null }])
    addProgressToast(id, `${label}...`)
    addProcessingIds(storyIds)

    const finishProcessing = () => removeProcessingIds(storyIds)

    submitFn()
      .then(({ taskId }) => {
        const poll = setInterval(async () => {
          try {
            let task: TaskState
            try {
              task = await adminApi.stories.taskStatus(taskId)
            } catch {
              // Server might have restarted — task lost
              clearInterval(poll)
              pollIntervalsRef.current.delete(id)
              setTasks(prev => prev.map(t =>
                t.id === id ? { ...t, status: 'error' } : t,
              ))
              updateToast(id, { type: 'error', message: `${label}: Task lost (server may have restarted)` })
              finishProcessing()
              onComplete?.()
              const timer = setTimeout(() => {
                setTasks(prev => prev.filter(t => t.id !== id))
                cleanupTimersRef.current.delete(id)
              }, 5000)
              cleanupTimersRef.current.set(id, timer)
              return
            }

            const current = task.completed + task.failed
            setTasks(prev => prev.map(t =>
              t.id === id ? { ...t, progress: { current, total: task.total } } : t,
            ))
            updateToast(id, { message: `${label}... ${current}/${task.total}` })

            if (task.status === 'completed' || task.status === 'failed') {
              clearInterval(poll)
              pollIntervalsRef.current.delete(id)

              const finalStatus: TaskStatus = task.failed > 0 ? 'error' : 'success'
              const finalMessage = task.failed > 0
                ? `${label}: ${task.completed} succeeded, ${task.failed} failed`
                : `${label}: ${task.completed} completed`

              setTasks(prev => prev.map(t =>
                t.id === id ? { ...t, status: finalStatus } : t,
              ))
              updateToast(id, { type: finalStatus, message: finalMessage })
              finishProcessing()
              onComplete?.()

              const timer = setTimeout(() => {
                setTasks(prev => prev.filter(t => t.id !== id))
                cleanupTimersRef.current.delete(id)
              }, 5000)
              cleanupTimersRef.current.set(id, timer)
            }
          } catch {
            // Transient poll error — keep trying
          }
        }, 2000)
        pollIntervalsRef.current.set(id, poll)
      })
      .catch((err: unknown) => {
        setTasks(prev => prev.map(t =>
          t.id === id ? { ...t, status: 'error' } : t,
        ))
        updateToast(id, {
          type: 'error',
          message: `${label}: ${err instanceof Error ? err.message : 'Failed to start'}`,
        })
        finishProcessing()
        const timer = setTimeout(() => {
          setTasks(prev => prev.filter(t => t.id !== id))
          cleanupTimersRef.current.delete(id)
        }, 5000)
        cleanupTimersRef.current.set(id, timer)
      })
  }, [addProgressToast, updateToast, addProcessingIds, removeProcessingIds])

  const hasRunningTasks = useMemo(() => tasks.some(t => t.status === 'running'), [tasks])

  const value = useMemo(() => ({
    tasks, launchTask, launchPolledTask, hasRunningTasks, processingIds,
  }), [tasks, launchTask, launchPolledTask, hasRunningTasks, processingIds])

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
