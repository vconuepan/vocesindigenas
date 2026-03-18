import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSubscribe } from './SubscribeProvider'

interface LandingCtaProps {
  heading: string
  description: string
}

export default function LandingCta({ heading, description }: LandingCtaProps) {
  const { t } = useTranslation()
  const { openSubscribe } = useSubscribe()

  return (
    <section className="mt-16 pt-10 border-t border-neutral-200 text-center">
      <h2 className="text-2xl md:text-3xl font-bold mb-3">{heading}</h2>
      <p className="text-lg text-neutral-600 mb-8 max-w-xl mx-auto">{description}</p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-brand-700 text-white font-medium rounded-lg hover:bg-brand-800 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        >
          {t('landing.readStories')}
        </Link>
        <button
          onClick={() => openSubscribe()}
          className="inline-flex items-center gap-2 px-6 py-3 border border-brand-700 text-brand-700 font-medium rounded-lg hover:bg-brand-50 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        >
          {t('landing.subscribeNewsletter')}
        </button>
      </div>
    </section>
  )
}
