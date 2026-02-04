import { useState, useRef, useEffect } from 'react'
import { publicApi } from '../lib/api'
import { BRAND } from '../config'

interface SubscribeModalProps {
  open: boolean
  onClose: () => void
}

export default function SubscribeModal({ open, onClose }: SubscribeModalProps) {
  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const dialogRef = useRef<HTMLDialogElement>(null)
  const firstInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open) {
      dialog.showModal()
      requestAnimationFrame(() => firstInputRef.current?.focus())
    } else {
      dialog.close()
    }
  }, [open])

  // Handle backdrop click
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const handleClick = (e: MouseEvent) => {
      if (e.target === dialog) onClose()
    }
    dialog.addEventListener('click', handleClick)
    return () => dialog.removeEventListener('click', handleClick)
  }, [onClose])

  // Handle Escape
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const handleCancel = (e: Event) => {
      e.preventDefault()
      onClose()
    }
    dialog.addEventListener('cancel', handleCancel)
    return () => dialog.removeEventListener('cancel', handleCancel)
  }, [onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setStatus('loading')
    setErrorMessage('')
    try {
      const result = await publicApi.subscribe({
        email: email.trim(),
        ...(firstName.trim() ? { firstName: firstName.trim() } : {}),
      })
      if (!result.success) {
        setStatus('error')
        setErrorMessage(result.message || 'Something went wrong. Please try again.')
        return
      }
      setStatus('success')
    } catch {
      setStatus('error')
      setErrorMessage('Something went wrong. Please try again.')
    }
  }

  const handleClose = () => {
    onClose()
    // Reset state after close animation
    setTimeout(() => {
      setFirstName('')
      setEmail('')
      setStatus('idle')
      setErrorMessage('')
    }, 200)
  }

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 m-auto w-full max-w-md rounded-xl bg-white p-0 shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      aria-labelledby="subscribe-title"
    >
      <div className="p-6 sm:p-8">
        {status === 'success' ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-50 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-neutral-900 mb-2">Check your email</h2>
            <p className="text-neutral-600 text-sm mb-6">
              We sent a confirmation link to <strong>{email}</strong>. Click the link to start receiving our weekly newsletter.
            </p>
            <button
              onClick={handleClose}
              className="px-6 py-2.5 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <h2 id="subscribe-title" className="text-xl font-bold text-neutral-900 mb-1">
                Stay informed
              </h2>
              <p className="text-neutral-500 text-sm">
                {BRAND.claim} Weekly to your inbox. {BRAND.claimSupport}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="subscribe-first-name" className="sr-only">First name (optional)</label>
                <input
                  ref={firstInputRef}
                  id="subscribe-first-name"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name (optional)"
                  autoComplete="given-name"
                  className="w-full px-4 py-3 text-base border border-neutral-300 rounded-lg bg-neutral-50 focus:bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-200 outline-none transition-colors"
                />
              </div>
              <div>
                <label htmlFor="subscribe-email" className="sr-only">Email address</label>
                <input
                  id="subscribe-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="w-full px-4 py-3 text-base border border-neutral-300 rounded-lg bg-neutral-50 focus:bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-200 outline-none transition-colors"
                  aria-describedby={errorMessage ? 'subscribe-error' : undefined}
                />
              </div>

              {status === 'error' && (
                <p id="subscribe-error" className="text-sm text-red-600" role="alert">
                  {errorMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full py-3 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
              </button>
            </form>

            <button
              type="button"
              onClick={handleClose}
              className="absolute top-3 right-3 p-1.5 text-neutral-400 hover:text-neutral-600 transition-colors rounded focus-visible:ring-2 focus-visible:ring-brand-500"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </>
        )}
      </div>
    </dialog>
  )
}
