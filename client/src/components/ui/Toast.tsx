import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import type { ReactNode } from 'react'
import { CheckCircleIcon, ExclamationCircleIcon, XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

export type ToastType = 'success' | 'error' | 'progress'

interface Toast {
  id: string
  type: ToastType
  message: string
}

interface ToastContextValue {
  toast: (type: 'success' | 'error', message: string) => void
  addProgressToast: (id: string, message: string) => void
  updateToast: (id: string, updates: { type?: ToastType; message?: string }) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let nextId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach(timer => clearTimeout(timer))
      timers.clear()
    }
  }, [])

  const startAutoDismiss = useCallback((id: string) => {
    const existing = timersRef.current.get(id)
    if (existing) clearTimeout(existing)
    const timer = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
      timersRef.current.delete(id)
    }, 4000)
    timersRef.current.set(id, timer)
  }, [])

  const addToast = useCallback((type: 'success' | 'error', message: string) => {
    const id = `auto-${nextId++}`
    setToasts(prev => [...prev, { id, type, message }])
    startAutoDismiss(id)
  }, [startAutoDismiss])

  const addProgressToast = useCallback((id: string, message: string) => {
    setToasts(prev => {
      if (prev.some(t => t.id === id)) {
        return prev.map(t => t.id === id ? { ...t, type: 'progress' as const, message } : t)
      }
      return [...prev, { id, type: 'progress' as const, message }]
    })
  }, [])

  const updateToast = useCallback((id: string, updates: { type?: ToastType; message?: string }) => {
    setToasts(prev => prev.map(t => {
      if (t.id !== id) return t
      return { ...t, ...updates }
    }))
    if (updates.type && updates.type !== 'progress') {
      startAutoDismiss(id)
    }
  }, [startAutoDismiss])

  const removeToast = useCallback((id: string) => {
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast: addToast, addProgressToast, updateToast, removeToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2" aria-live="polite">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg text-sm font-medium ${
              t.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : t.type === 'error'
                  ? 'bg-red-50 text-red-800 border border-red-200'
                  : 'bg-blue-50 text-blue-800 border border-blue-200'
            }`}
          >
            {t.type === 'success' ? (
              <CheckCircleIcon className="h-5 w-5 text-green-500 shrink-0" />
            ) : t.type === 'error' ? (
              <ExclamationCircleIcon className="h-5 w-5 text-red-500 shrink-0" />
            ) : (
              <ArrowPathIcon className="h-5 w-5 text-blue-500 shrink-0 animate-spin" />
            )}
            <span>{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              className="ml-2 shrink-0 text-current opacity-50 hover:opacity-100"
              aria-label="Dismiss"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
