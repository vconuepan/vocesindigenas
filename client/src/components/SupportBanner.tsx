import { useTranslation } from 'react-i18next'
import { useSubscribe } from './SubscribeProvider'

const KOFI_URL = "https://ko-fi.com/impactoindigena"

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  )
}

function NewsletterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  )
}

export default function SupportBanner() {
  const { t } = useTranslation()
  const { openSubscribe } = useSubscribe()

  return (
    <div
      className="-mx-4 md:-mx-8 px-4 md:px-8 py-14 md:py-20 my-12 relative overflow-hidden"
      style={{ backgroundColor: '#0D5F3C' }}
    >
      {/* Decorative watermark */}
      <div
        className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none select-none hidden md:block"
        aria-hidden="true"
        style={{ opacity: 0.05, fontSize: '18rem', fontFamily: 'Fraunces, Georgia, serif', fontWeight: 700, lineHeight: 1, color: '#fff' }}
      >
        ◆
      </div>

      <div className="relative z-10 max-w-2xl mx-auto text-center">
        {/* Eyebrow */}
        <p className="text-xs font-bold uppercase tracking-widest mb-5 font-dm-sans" style={{ color: 'rgba(255,255,255,0.55)' }}>
          {t('support.eyebrow', 'Periodismo indígena independiente')}
        </p>

        <h2
          className="text-2xl md:text-3xl font-bold mb-5 leading-tight"
          style={{ color: '#fff', fontFamily: 'Fraunces, Georgia, serif' }}
        >
          {t('support.heading', 'Voces que el mainstream ignora. Las cubrimos nosotros.')}
        </h2>

        <p className="text-base md:text-lg mb-8 leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>
          {t('support.message')}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {/* Primary: subscribe (white filled) */}
          <button
            onClick={() => openSubscribe()}
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-700"
            style={{ backgroundColor: '#fff', color: '#0D5F3C' }}
          >
            <NewsletterIcon className="w-4 h-4 shrink-0" />
            {t('nav.subscribe')}
          </button>

          {/* Secondary: ko-fi (ghost white outline) */}
          <a
            href={KOFI_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-700"
            style={{ border: '1px solid rgba(255,255,255,0.45)', color: '#fff' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.8)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.45)' }}
          >
            <HeartIcon className="w-4 h-4 shrink-0" />
            {t('support.button')}
            <span className="sr-only">{t('support.opensInNewTab')}</span>
          </a>
        </div>
      </div>
    </div>
  )
}
