import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import ObfuscatedAddress from '../components/ObfuscatedAddress'
import ObfuscatedEmail from '../components/ObfuscatedEmail'

export default function ImprintPage() {
  return (
    <>
      <Helmet>
        <title>Imprint - Actually Relevant</title>
        <meta
          name="description"
          content="Imprint and contact information for Actually Relevant."
        />
        <meta property="og:title" content="Imprint - Actually Relevant" />
        <meta property="og:description" content="Imprint and contact information for Actually Relevant." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://actuallyrelevant.news/imprint" />
        <meta property="og:image" content="https://actuallyrelevant.news/images/logo-text-square.jpg" />
      </Helmet>

      <div className="page-section">
        <h1 className="page-title">Imprint</h1>

        <div className="prose max-w-none">
          <h2 className="section-heading mt-8">
            Information According to &sect; 5 TMG
          </h2>
          <ObfuscatedAddress className="not-italic text-neutral-600 leading-relaxed" />
          <p className="mt-2">
            Email: <ObfuscatedEmail className="text-brand-700 hover:text-brand-800" />
          </p>

          <h2 className="section-heading mt-8">Editorially Responsible</h2>
          <ObfuscatedAddress className="not-italic text-neutral-600 leading-relaxed" />

          <hr className="my-10 border-neutral-200" />

          <p>
            For information about data collection and privacy, see our{' '}
            <Link to="/privacy" className="text-brand-700 hover:text-brand-800">
              Privacy Policy
            </Link>. (Spoiler: we collect almost nothing.)
          </p>
        </div>
      </div>
    </>
  )
}
