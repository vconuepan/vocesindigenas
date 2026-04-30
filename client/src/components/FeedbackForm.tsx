import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { publicApi } from '../lib/api'

interface FeedbackFormProps {
  /** Called after successful submission (e.g. to close a modal) */
  onSuccess?: () => void
  /** Auto-focus the message textarea on mount */
  autoFocus?: boolean
  /** ID prefix for form elements (avoids collisions when rendered multiple times) */
  idPrefix?: string
  /** Hide the heading and tagline (when the parent provides its own) */
  hideHeading?: boolean
}

const CATEGORY_VALUES = ['general', 'bug', 'suggestion', 'other'] as const
type CategoryValue = typeof CATEGORY_VALUES[number]

// Must match config.feedback.messageMaxLength on the server
const MAX_MESSAGE_LENGTH = 2000

export default function FeedbackForm({
  onSuccess,
  autoFocus = false,
  idPrefix = 'feedback',
  hideHeading = false,
}: FeedbackFormProps) {
  const { t } = useTranslation()
  const [category, setCategory] = useState<CategoryValue>('general')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('') // honeypot
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const messageRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (autoFocus) {
      requestAnimationFrame(() => messageRef.current?.focus())
    }
  }, [autoFocus])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    setStatus('loading')
    setErrorMessage('')
    try {
      await publicApi.submitFeedback({
        category,
        message: message.trim(),
        ...(email.trim() ? { email: email.trim() } : {}),
        ...(website ? { website } : {}),
      })
      setStatus('success')
    } catch {
      setStatus('error')
      setErrorMessage(t('feedback.error'))
    }
  }

  if (status === 'success') {
    return (
      <div className="text-center py-4" role="status">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-50 flex items-center justify-center">
          <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-neutral-900 mb-2">{t('feedback.successTitle')}</h2>
        <p className="text-neutral-600 text-sm mb-6">
          {t('feedback.successMessage')}
        </p>
        {onSuccess && (
          <button
            onClick={onSuccess}
            className="px-6 py-2.5 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            {t('feedback.done')}
          </button>
        )}
      </div>
    )
  }

  return (
    <>
      {!hideHeading && (
        <div className="text-center mb-6">
          <h2 id={`${idPrefix}-title`} className="text-xl font-bold text-neutral-900">
            {t('feedback.title')}
          </h2>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Category */}
        <fieldset>
          <legend className="sr-only">{t('feedback.categoryLegend')}</legend>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_VALUES.map((val) => (
              <label
                key={val}
                className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm cursor-pointer transition-colors border ${
                  category === val
                    ? 'bg-brand-50 border-brand-300 text-brand-800 font-medium'
                    : 'bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                <input
                  type="radio"
                  name={`${idPrefix}-category`}
                  value={val}
                  checked={category === val}
                  onChange={() => setCategory(val)}
                  className="sr-only"
                />
                {t(`feedback.category_${val}`)}
              </label>
            ))}
          </div>
        </fieldset>

        {/* Message */}
        <div>
          <label htmlFor={`${idPrefix}-message`} className="sr-only">{t('feedback.messageLegend')}</label>
          <textarea
            ref={messageRef}
            id={`${idPrefix}-message`}
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
            placeholder={t('feedback.messagePlaceholder')}
            required
            rows={4}
            className="w-full px-4 py-3 text-base border border-neutral-300 rounded-lg bg-neutral-50 focus:bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-200 outline-none transition-colors resize-y"
            aria-describedby={`${idPrefix}-char-count`}
          />
          <p id={`${idPrefix}-char-count`} className="text-xs text-neutral-500 text-right mt-1">
            {message.length}/{MAX_MESSAGE_LENGTH}
          </p>
        </div>

        {/* Email (optional) */}
        <div>
          <label htmlFor={`${idPrefix}-email`} className="block text-sm font-medium text-neutral-700 mb-1">
            {t('feedback.emailLabel')} <span className="font-normal text-neutral-500">{t('feedback.emailOptional')}</span>
          </label>
          <input
            id={`${idPrefix}-email`}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('feedback.emailPlaceholder')}
            autoComplete="email"
            className="w-full px-4 py-3 text-base border border-neutral-300 rounded-lg bg-neutral-50 focus:bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-200 outline-none transition-colors"
          />
        </div>

        {/* Honeypot — hidden from humans */}
        <div aria-hidden="true" className="absolute -left-[9999px] -top-[9999px]">
          <label htmlFor={`${idPrefix}-website`}>Website</label>
          <input
            id={`${idPrefix}-website`}
            type="text"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        {status === 'error' && (
          <p id={`${idPrefix}-error`} className="text-sm text-red-600" role="alert">
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={status === 'loading' || !message.trim()}
          aria-describedby={status === 'error' ? `${idPrefix}-error` : undefined}
          className="w-full py-3 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {status === 'loading' ? t('feedback.sending') : t('feedback.submit')}
        </button>
      </form>
    </>
  )
}
