import { useSearchParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'

export default function SubscribedPage() {
  const [searchParams] = useSearchParams()
  const error = searchParams.get('error')

  if (error === 'expired') {
    return (
      <>
        <Helmet>
          <title>Link Expired - Actually Relevant</title>
          <meta name="description" content="Your confirmation link has expired." />
        </Helmet>
        <div className="page-section text-center py-16">
          <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-4">Link Expired</h1>
          <p className="text-neutral-600 mb-6">
            Your confirmation link has expired. Please subscribe again to receive a new link.
          </p>
          <Link
            to="/"
            className="text-brand-700 hover:text-brand-800 font-medium focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-1"
          >
            &larr; Back to home
          </Link>
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <Helmet>
          <title>Invalid Link - Actually Relevant</title>
          <meta name="description" content="Invalid confirmation link." />
        </Helmet>
        <div className="page-section text-center py-16">
          <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-4">Invalid Link</h1>
          <p className="text-neutral-600 mb-6">
            This confirmation link is invalid or has already been used.
          </p>
          <Link
            to="/"
            className="text-brand-700 hover:text-brand-800 font-medium focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-1"
          >
            &larr; Back to home
          </Link>
        </div>
      </>
    )
  }

  return (
    <>
      <Helmet>
        <title>Welcome to the Newsletter - Actually Relevant</title>
        <meta name="description" content="You're subscribed to the Actually Relevant weekly newsletter." />
      </Helmet>
      <div className="page-section text-center py-16">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-brand-50 flex items-center justify-center">
          <svg className="w-8 h-8 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-4">Welcome to the newsletter!</h1>
        <p className="text-neutral-500 text-sm italic mb-3 max-w-md mx-auto">
          News that matters to humanity. Weekly to your inbox. Curated with care by AI.
        </p>
        <p className="text-neutral-600 mb-8 max-w-md mx-auto">
          Your subscription is confirmed. In the meantime, explore what's making headlines right now.
        </p>
        <Link
          to="/"
          className="inline-block px-6 py-2.5 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        >
          Explore today's stories
        </Link>
      </div>
    </>
  )
}
