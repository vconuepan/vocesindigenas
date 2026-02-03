import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <>
      <Helmet>
        <title>Page Not Found - Actually Relevant</title>
      </Helmet>
      <div className="page-section text-center">
        <h1 className="page-title">404</h1>
        <p className="page-intro">Page not found.</p>
        <Link
          to="/"
          className="text-brand-700 hover:text-brand-800 underline underline-offset-2 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-1"
        >
          Go home
        </Link>
      </div>
    </>
  )
}
