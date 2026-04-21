import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react'
import { SEO, CommonOgTags } from '../lib/seo'
import { buildBreadcrumbSchema } from '../lib/structured-data'
import StructuredData from '../components/StructuredData'
import ComparisonTable from '../components/ComparisonTable'
import { API_BASE } from '../lib/api'
import { useSources } from '../hooks/useSources'

const META = {
  title: 'Free Curated News API \u2014 No Key Required | Impacto Ind\u00edgena',
  description:
    'A free API serving AI-curated indigenous and global news. No API key, no ads in the data. Get pre-selected stories on indigenous rights, environment, and more.',
  url: `${SEO.siteUrl}/free-api`,
}

const pageSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: META.title,
  description: META.description,
  url: META.url,
  mainEntity: {
    '@type': 'WebAPI',
    name: 'Impacto Ind\u00edgena News API',
    description:
      'Free, curated news API covering indigenous rights, environment, and global issues. No authentication required.',
    url: `${SEO.siteUrl}/developers`,
    documentation: `${SEO.siteUrl}/developers`,
    provider: {
      '@type': 'Organization',
      name: 'Impacto Ind\u00edgena',
      url: SEO.siteUrl,
    },
  },
}

const breadcrumb = buildBreadcrumbSchema([
  { name: 'Home', url: SEO.siteUrl },
  { name: 'Free API', url: META.url },
])

const COMPARISON_HEADERS = ['', 'Impacto Ind\u00edgena', 'Typical news API (NewsAPI, GNews, etc.)']

const COMPARISON_ROWS = [
  {
    feature: 'Content',
    cells: [
      { text: 'Pre-curated, AI-selected for significance', check: true },
      'Raw firehose \u2014 millions of unfiltered articles',
    ],
  },
  {
    feature: 'API key',
    cells: [
      { text: 'Not required', check: true },
      'Required (signup + often credit card)',
    ],
  },
  {
    feature: 'Ads in response',
    cells: [
      { text: 'Never', check: true },
      'Sometimes (sponsored placements)',
    ],
  },
  {
    feature: 'Focus',
    cells: [
      { text: 'Global issues (4 domains)', check: true },
      'General (everything)',
    ],
  },
  {
    feature: 'Cost',
    cells: [
      { text: 'Free', check: true },
      'Free tier + paid plans ($50\u2013$500+/month)',
    ],
  },
]

const ENDPOINTS = [
  {
    method: 'GET',
    path: '/api/stories',
    description: "Today's curated stories (paginated)",
  },
  {
    method: 'GET',
    path: '/api/stories?issueSlug=',
    description: 'Filter by issue area (e.g., planet-climate, human-development)',
  },
  {
    method: 'GET',
    path: '/api/stories/:slug',
    description: 'Individual story by slug',
  },
  {
    method: 'GET',
    path: '/api/issues',
    description: 'All issue areas with metadata and source names',
  },
  {
    method: 'GET',
    path: '/api/feed',
    description: 'RSS feed (all issue areas)',
  },
]

const USE_CASES = [
  {
    title: 'Embed curated news on your site',
    description:
      'Add a "World News That Matters" section to your nonprofit site, blog, or community platform. Fetch today\'s stories and render them in your own design.',
  },
  {
    title: 'Power a Slack or Discord bot',
    description:
      'Send a curated digest of global news to your team channel. The API returns structured data that\u2019s easy to format for messaging platforms.',
  },
  {
    title: 'Feed a research dashboard',
    description:
      'Track coverage of climate policy, global health, or security issues over time. The API includes relevance scores, issue areas, and source metadata.',
  },
  {
    title: 'Build educational tools',
    description:
      'Use curated, significance-scored news in media literacy curricula or classroom discussion tools.',
  },
  {
    title: 'Augment your own AI pipeline',
    description:
      'Use our curated output as a high-quality input signal for your own analysis, summarization, or alerting systems.',
  },
]

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
    </svg>
  )
}

export default function FreeApiPage() {
  const { data: sources } = useSources()
  return (
    <>
      <Helmet>
        <title>{META.title}</title>
        <meta name="description" content={META.description} />
        <meta property="og:title" content={META.title} />
        <meta property="og:description" content={META.description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={META.url} />
        <link rel="canonical" href={META.url} />
        {CommonOgTags({})}
      </Helmet>
      <StructuredData data={[pageSchema, breadcrumb]} />

      <div className="page-section">
        <h1 className="page-title">A Free API for News That Matters</h1>
        <div className="prose max-w-none">
          <p className="text-lg text-neutral-600 leading-relaxed">
            Most news APIs give you a firehose — millions of raw articles you have to filter
            yourself. Impacto Ind\u00edgena gives you the signal: a curated selection of stories per
            day, selected by AI for real-world significance
            from{sources ? ` ${sources.totalCount}` : ''} curated sources across multiple
            languages.
          </p>
          <p>No API key. No ads in the response.</p>

          {/* Quick Start */}
          <h2 className="section-heading mt-10">Quick Start</h2>
          <pre className="bg-neutral-900 text-neutral-100 rounded-lg p-4 overflow-x-auto text-sm leading-relaxed">
            <code>{`# Get today's curated stories
curl ${API_BASE}/stories

# Filter by issue area
curl "${API_BASE}/stories?issueSlug=planet-climate"`}</code>
          </pre>
          <p className="text-sm text-neutral-500 mt-3">
            These endpoints return JSON. Use curl, fetch(), or an API client. The responses won't
            look nice in a browser. Response includes: title, summary, blurb, source, URL, issue
            area, relevance scores, publication date, and more.
          </p>
          <p className="mt-2">
            <Link to="/developers" className="text-brand-800 hover:text-brand-700 underline focus-visible:ring-2 focus-visible:ring-brand-500 rounded">
              Full API documentation            </Link>
          </p>

        </div>

        {/* What Makes This Different — colored cards */}
        <h2 className="section-heading mt-10">What Makes This Different</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          {[
            {
              icon: (
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              ),
              title: 'Pre-Curated, Not Raw',
              description: 'Every story passes through a multi-stage AI pipeline. You get editorial judgment, not a keyword search against millions of articles.',
              border: 'border-l-brand-400',
            },
            {
              icon: (
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              ),
              title: 'No Key Required',
              description: 'Hit the endpoint. Get the data. No signup, no OAuth, no billing page. Built for quick integration.',
              border: 'border-l-teal-400',
            },
            {
              icon: (
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              ),
              title: 'No Ads in the Data',
              description: 'Clean JSON. No sponsored placements, no affiliate links, no promoted stories. What you get is what we curated.',
              border: 'border-l-amber-400',
            },
            {
              icon: (
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
              title: 'Global Issues Focus',
              description: 'Four domains: Human Development, Planet & Climate, Existential Threats, and Science & Technology.',
              border: 'border-l-indigo-400',
            },
          ].map((card) => (
            <div
              key={card.title}
              className={`bg-white border border-neutral-200 ${card.border} border-l-4 rounded-lg p-5`}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-neutral-500">{card.icon}</span>
                <h3 className="font-bold text-neutral-800">{card.title}</h3>
              </div>
              <p className="text-sm text-neutral-600 leading-relaxed">{card.description}</p>
            </div>
          ))}
        </div>
        <div className="prose max-w-none mt-4">
          <p>
            <Link to="/methodology" className="text-brand-800 hover:text-brand-700 underline focus-visible:ring-2 focus-visible:ring-brand-500 rounded">
              Learn how our curation works
            </Link>
          </p>
        </div>

        {/* Use Cases — Accordions */}
        <h2 className="section-heading mt-10">Use Cases</h2>
        <div className="mt-4 space-y-2">
          {USE_CASES.map((uc) => (
            <Disclosure key={uc.title} as="div" className="border border-neutral-200 rounded-lg">
              <DisclosureButton className="flex w-full items-center justify-between px-5 py-4 text-left font-bold text-neutral-800 hover:bg-neutral-50 transition-colors rounded-lg focus-visible:ring-2 focus-visible:ring-brand-500">
                {uc.title}
                <ChevronIcon className="w-5 h-5 text-neutral-400 data-[open]:rotate-180 transition-transform shrink-0" />
              </DisclosureButton>
              <DisclosurePanel className="px-5 pb-4 text-sm text-neutral-600 leading-relaxed">
                {uc.description}
              </DisclosurePanel>
            </Disclosure>
          ))}
        </div>

        {/* What's Available — Styled Endpoint Cards */}
        <h2 className="section-heading mt-10">What's Available</h2>
        <div className="mt-4 space-y-3">
          {ENDPOINTS.map((ep) => (
            <div key={ep.path} className="flex items-start gap-3 border border-neutral-200 rounded-lg px-5 py-4">
              <span className="shrink-0 px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-800 mt-0.5">
                {ep.method}
              </span>
              <div>
                <p className="font-mono text-sm text-neutral-800">{ep.path}</p>
                <p className="text-sm text-neutral-500 mt-0.5">{ep.description}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="prose max-w-none">
          <p className="mt-4">
            For the full OpenAPI specification, endpoint details, and response schemas:{' '}
            <Link to="/developers" className="text-brand-800 hover:text-brand-700 underline focus-visible:ring-2 focus-visible:ring-brand-500 rounded">
              API Documentation            </Link>
          </p>

          {/* Comparison */}
          <h2 className="section-heading mt-10">How This Compares to Other News APIs</h2>
          <div className="mt-4 mb-4">
            <ComparisonTable
              headers={COMPARISON_HEADERS}
              rows={COMPARISON_ROWS}
              highlightColumn={0}
            />
          </div>
          <p>
            <Link to="/compare" className="text-brand-800 hover:text-brand-700 underline focus-visible:ring-2 focus-visible:ring-brand-500 rounded">
              See how we compare to other news services overall            </Link>
          </p>

          {/* RSS Feeds */}
          <h2 className="section-heading mt-10">RSS Feeds</h2>
          <p>
            Prefer RSS? We publish feeds per issue area. Add them to any RSS reader, use them in
            automation workflows (Zapier, n8n, IFTTT), or build your own integration.
          </p>
          <ul className="list-disc pl-6 space-y-1 mt-3 font-mono text-sm">
            <li>
              Human Development:{' '}
              <span className="text-brand-800">
                {API_BASE}/feed?issueSlug=human-development
              </span>
            </li>
            <li>
              Planet & Climate:{' '}
              <span className="text-brand-800">
                {API_BASE}/feed?issueSlug=planet-climate
              </span>
            </li>
            <li>
              Existential Threats:{' '}
              <span className="text-brand-800">
                {API_BASE}/feed?issueSlug=existential-threats
              </span>
            </li>
            <li>
              Science & Technology:{' '}
              <span className="text-brand-800">
                {API_BASE}/feed?issueSlug=science-technology
              </span>
            </li>
          </ul>

          {/* Widgets */}
          <h2 className="section-heading mt-10">Embeddable Widgets</h2>
          <p>
            Want to embed curated stories directly on your website? Use our widget generator to
            create a customizable news widget — no backend required.
          </p>
          <p className="mt-2">
            <Link to="/widgets" className="text-brand-800 hover:text-brand-700 underline focus-visible:ring-2 focus-visible:ring-brand-500 rounded">
              Build a widget
            </Link>
          </p>
        </div>

        {/* CTA */}
        <section className="mt-16 pt-10 border-t border-neutral-200 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            Start building with curated news.
          </h2>
          <p className="text-lg text-neutral-600 mb-8 max-w-xl mx-auto">
            No signup, no key, no cost. Hit the API and see what you get.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/developers"
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-700 text-white font-medium rounded-lg hover:bg-brand-800 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              Read the API docs            </Link>
            <a
              href={`${API_BASE}/stories`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 border border-brand-700 text-brand-800 font-medium rounded-lg hover:bg-brand-50 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              Try it now: /api/stories              <span className="sr-only">(opens in new tab)</span>
            </a>
          </div>
        </section>
      </div>
    </>
  )
}
