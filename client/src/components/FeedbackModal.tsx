import { useRef, useEffect } from 'react'
import FeedbackForm from './FeedbackForm'

interface FeedbackModalProps {
  open: boolean
  onClose: () => void
}

export default function FeedbackModal({ open, onClose }: FeedbackModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open) {
      dialog.showModal()
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

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 m-auto w-full max-w-md rounded-xl bg-white p-0 shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      aria-labelledby="feedback-modal-title"
    >
      <div className="p-6 sm:p-8">
        <FeedbackForm
          key={open ? 'open' : 'closed'}
          autoFocus={open}
          onSuccess={onClose}
          idPrefix="feedback-modal"
        />
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 text-neutral-400 hover:text-neutral-600 transition-colors rounded focus-visible:ring-2 focus-visible:ring-brand-500"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </dialog>
  )
}
