import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { SEO, CommonOgTags } from '../lib/seo'
import { useSources } from '../hooks/useSources'
import StructuredData from '../components/StructuredData'
import { buildBreadcrumbSchema } from '../lib/structured-data'

const KOFI_URL = 'https://ko-fi.com/odinmb'

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  )
}

export default function AboutPage() {
  const { data: sources } = useSources()
  return (
    <>
      <Helmet>
        <title>About - {SEO.siteName}</title>
        <meta name="description" content="Actually Relevant is a non-commercial, AI-curated news platform focused on what truly matters for humanity. Learn the story behind the project." />
        <meta property="og:title" content={`About - ${SEO.siteName}`} />
        <meta property="og:description" content="Actually Relevant is a non-commercial, AI-curated news platform focused on what truly matters for humanity." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${SEO.siteUrl}/about`} />
        {CommonOgTags({})}
      </Helmet>
      <StructuredData data={[
        {
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: `About - ${SEO.siteName}`,
          description: 'Actually Relevant is a non-commercial, AI-curated news platform focused on what truly matters for humanity.',
          url: `${SEO.siteUrl}/about`,
          isPartOf: { '@type': 'WebSite', name: SEO.siteName, url: SEO.siteUrl },
        },
        buildBreadcrumbSchema([
          { name: 'Home', url: SEO.siteUrl },
          { name: 'About' },
        ]),
      ]} />

      <div className="page-section">
        <h1 className="page-title">About Actually Relevant</h1>
        <p className="page-intro">
          A side-project make the news worth reading again
        </p>

        <div className="prose max-w-none">
          <h2 className="section-heading mt-8">The Story</h2>
          <p>
            I wanted news that told me what actually matters in the world. Not celebrity news,
            sports, and the predictable back-and-forth of partisan politics. Climate breakthroughs,
            global health milestones, policy shifts affecting hundreds of millions of people. The
            stuff that gets buried.
          </p>
          <p>
            So I built what I wanted: an AI that reads{sources ? ` ${sources.totalCount}` : ''} news
            sources across multiple languages and surfaces only the stories that genuinely matter to
            humanity. No ads, no tracking, no personalization bubbles. When assessing relevance, every human counts the same, no matter where they live. A policy change that affects the entire elderly care system in China is more important than
            most policy debates in Washington.
          </p>

          {/* Profile card — floated before h2 so it top-aligns with the section title */}
          <div className="float-right ml-6 mb-4 mt-8 w-40 bg-neutral-50 border border-neutral-200 rounded-xl p-4 flex flex-col items-center text-center">
            <a href="https://odins.website" target="_blank" rel="noopener noreferrer" className="shrink-0 focus-visible:ring-2 focus-visible:ring-brand-500 rounded-full">
              <img
                src="/images/optimized/odin-profile-small-w.webp"
                alt="Odin Mühlenbein"
                className="w-24 h-24 rounded-full object-cover ring-2 ring-neutral-200 mb-3"
              />
            </a>
            <span className="font-semibold text-neutral-900">Odin Mühlenbein</span>
            <p className="text-sm text-neutral-500 mt-0.5 mb-2">AI Tinkerer</p>
            <div className="flex flex-col gap-1.5">
              <a
                href="https://odins.website"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-brand-700 hover:text-brand-800 focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                Website
              </a>
              <a
                href="https://www.linkedin.com/in/odinmuehlenbein/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-brand-700 hover:text-brand-800 focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
                LinkedIn
              </a>
            </div>
          </div>

          <h2 className="section-heading mt-8">Who's Behind This</h2>

          <p>
            Actually Relevant started as a side project, a way to scratch my own itch for better
            news. It's not a media company, not a startup, and not backed by investors.
          </p>
          <p>
            Do you know an organization that could take this project further than one person can? I'm willing to hand it over.{' '}
            <Link to="/stewardship" className="text-brand-700 hover:text-brand-800 underline focus-visible:ring-2 focus-visible:ring-brand-500 rounded">
              Learn more about stewardship
            </Link>
            .
          </p>

        </div>

        {/* Support section */}
        <div className="mt-2 pt-8 text-center">
          <a
            href={KOFI_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-neutral-800 rounded-lg hover:bg-neutral-700 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            <HeartIcon className="w-4 h-4" />
            Support
            <span className="sr-only">(opens in new tab)</span>
          </a>
        </div>

        <div className="prose max-w-none mt-12 pt-8 border-t border-neutral-200">
          <h2 className="section-heading">Explore</h2>
          <ul className="space-y-2 my-4">
            <li>
              <Link to="/methodology" className="text-brand-700 hover:text-brand-800 font-normal">
                Methodology
              </Link>
              {' '}&mdash; How we select stories, from source to publication
            </li>
            <li>
              <Link to="/compare" className="text-brand-700 hover:text-brand-800 font-normal">
                Compare
              </Link>
              {' '}&mdash; Side-by-side comparison with Google News, Flipboard, and others
            </li>
            <li>
              <Link to="/news-fatigue" className="text-brand-700 hover:text-brand-800 font-normal">
                News Fatigue
              </Link>
              {' '}&mdash; Why people avoid the news and how we help
            </li>
            <li>
              <Link to="/no-ads-no-tracking" className="text-brand-700 hover:text-brand-800 font-normal">
                No Ads, No Tracking
              </Link>
              {' '}&mdash; Our commitment to privacy and independence
            </li>
            <li>
              <Link to="/free-api" className="text-brand-700 hover:text-brand-800 font-normal">
                Free API
              </Link>
              {' '}&mdash; Build with our curated news data, no key required
            </li>
            <li>
              <Link to="/stewardship" className="text-brand-700 hover:text-brand-800 font-normal">
                Stewardship
              </Link>
              {' '}&mdash; Help this project find a long-term home
            </li>
          </ul>
        </div>
      </div>
    </>
  )
}
