import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { SEO, CommonOgTags } from '../lib/seo'
import { buildBreadcrumbSchema } from '../lib/structured-data'
import StructuredData from '../components/StructuredData'
import LandingCta from '../components/LandingCta'

const META = {
  title: 'News Without Ads or Tracking \u2014 Impacto Indígena',
  description:
    'A daily news digest with zero ads, zero tracking, and zero clickbait. No cookies, no analytics profiles, no engagement optimization. Just the stories that matter.',
  url: `${SEO.siteUrl}/no-ads-no-tracking`,
}

const pageSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: META.title,
  description: META.description,
  url: META.url,
  publisher: {
    '@type': 'Organization',
    name: 'Impacto Indígena',
    url: SEO.siteUrl,
    nonprofitStatus: 'NonprofitType',
  },
}

const breadcrumb = buildBreadcrumbSchema([
  { name: 'Home', url: SEO.siteUrl },
  { name: 'No Ads, No Tracking', url: META.url },
])

const COMPARISON = [
  { us: 'No ads', them: 'Display, native, and sponsored ads' },
  { us: 'No tracking*', them: 'Dozens of third-party trackers' },
  { us: 'No clickbait', them: 'Engagement-optimized headlines' },
  { us: 'Funded by donations', them: 'Funded by advertising' },
  { us: 'Never sells data', them: 'Data often sold or shared' },
]

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  )
}

export default function NoAdsNoTrackingPage() {
  return (
    <>
      <Helmet>
        <title>{META.title}</title>
        <meta name="description" content={META.description} />
        <meta property="og:title" content={META.title} />
        <meta property="og:description" content={META.description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={META.url} />
        {CommonOgTags({})}
      </Helmet>
      <StructuredData data={[pageSchema, breadcrumb]} />

      <div className="page-section">
        <h1 className="page-title">News Without Ads, Tracking, or Clickbait</h1>
        <div className="prose max-w-none">
          <p className="text-lg text-neutral-600 leading-relaxed">
            Most free news services make money from your data. Here's how Impacto Indígena is
            different.
          </p>

          {/* Two-column comparison */}
          <table className="w-full text-sm border-collapse mt-6 mb-2">
            <thead>
              <tr>
                <th className="text-left py-3 px-4 font-bold bg-brand-50 text-brand-800 border-b border-brand-200 rounded-tl-lg">
                  Impacto Indígena
                </th>
                <th className="text-left py-3 px-4 font-bold bg-neutral-50 text-neutral-700 border-b border-neutral-300 rounded-tr-lg">
                  Typical news aggregator
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'}>
                  <td className="py-2.5 px-4 border-b border-neutral-200 text-neutral-800 font-medium">
                    {row.us}
                  </td>
                  <td className="py-2.5 px-4 border-b border-neutral-200 text-neutral-500">
                    {row.them}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-neutral-400 mt-1">
            * Our newsletter provider tracks email opens and link clicks. We cannot disable this.
            We do not use this data for profiling or advertising. See our{' '}
            <Link to="/privacy" className="underline hover:text-neutral-300">
              privacy policy
            </Link>{' '}
            for details.
          </p>
          <p className="mt-4">
            Want the full comparison?{' '}
            <Link to="/compare" className="text-brand-700 hover:text-brand-800 underline focus-visible:ring-2 focus-visible:ring-brand-500 rounded">
              See all aggregators side by side
            </Link>
          </p>

        </div>

        {/* What We Don't Show — 2x2 cards */}
        <h2 className="section-heading mt-10">What We Don't Show</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          {[
            {
              icon: (
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              ),
              title: 'No Ads',
              description: 'Not now, not ever. No display ads, sponsored content, or "recommended" links.',
              border: 'border-l-brand-400',
            },
            {
              icon: (
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
              ),
              title: 'No Clickbait',
              description: 'Stories selected by significance, not click potential. Headlines inform, not bait.',
              border: 'border-l-teal-400',
            },
            {
              icon: (
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              ),
              title: 'No Paywalls',
              description: 'Everything is free. The site, the API, the RSS feeds. No premium tiers.',
              border: 'border-l-amber-400',
            },
            {
              icon: (
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              ),
              title: 'No Filter Bubble',
              description: 'Everyone sees the same curated stories. No personalization, no algorithmic profiling.',
              border: 'border-l-indigo-400',
            },
          ].map((card) => (
            <div
              key={card.title}
              className={`bg-white border border-neutral-200 ${card.border} border-l-4 rounded-lg p-5`}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-neutral-500">{card.icon}</span>
                <p className="font-bold text-neutral-800">{card.title}</p>
              </div>
              <p className="text-sm text-neutral-600 leading-relaxed">{card.description}</p>
            </div>
          ))}
        </div>
        <div className="prose max-w-none mt-4">
          <p>
            For details on what data we collect (or rather don't collect), see our{' '}
            <Link to="/privacy" className="text-brand-700 hover:text-brand-800 underline focus-visible:ring-2 focus-visible:ring-brand-500 rounded">
              privacy policy
            </Link>
            .
          </p>
        </div>

        {/* How We Stay Free — SupportBanner style */}
        <div className="mt-12 pt-8 border-t border-neutral-200 text-center">
          <div className="flex items-center justify-center gap-4 mb-5">
            <span className="flex-1 border-t border-neutral-200" aria-hidden="true" />
            <HeartIcon className="w-5 h-5 text-brand-300" />
            <span className="flex-1 border-t border-neutral-200" aria-hidden="true" />
          </div>
          <h2 className="text-2xl font-bold mb-3">How We Stay Free</h2>
          <p className="text-lg text-neutral-600 leading-relaxed mb-4 max-w-xl mx-auto">
            Free. Independent. Without ads.
          </p>
        </div>

        <LandingCta
          heading="Read the news without being the product."
          description="Visit impactoindigena.news — or subscribe to the newsletter for a clean, ad-free digest."
        />
      </div>
    </>
  )
}
