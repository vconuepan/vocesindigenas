import { type ReactNode, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { SEO, CommonOgTags } from '../lib/seo'
import { buildBreadcrumbSchema } from '../lib/structured-data'
import StructuredData from '../components/StructuredData'
import { useSources } from '../hooks/useSources'

const META = {
  title: 'Stewardship \u2014 Actually Relevant',
  description:
    'Actually Relevant is looking for a long-term home. If you work in journalism, civic tech, or effective altruism, here\u2019s what you\u2019d receive and how to start the conversation.',
  url: `${SEO.siteUrl}/stewardship`,
}

const pageSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: META.title,
  description: META.description,
  url: META.url,
  publisher: {
    '@type': 'Organization',
    name: 'Actually Relevant',
    url: SEO.siteUrl,
  },
}

const breadcrumb = buildBreadcrumbSchema([
  { name: 'Home', url: SEO.siteUrl },
  { name: 'Stewardship', url: META.url },
])

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  )
}

function ChevronIcon({ open, className }: { open: boolean; className?: string }) {
  return (
    <svg
      className={`${className} transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  )
}

const RECEIVE_CARDS: { icon: ReactNode; title: string; description: string; border: string }[] = [
  {
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 18.364a9 9 0 1012.728 0M12 2v10" />
      </svg>
    ),
    title: 'Automated Pipeline',
    description: 'Daily crawl, AI analysis, selection, and publication with no manual intervention.',
    border: 'border-l-brand-400',
  },
  {
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Complete Platform',
    description: 'Public website, free API, RSS feeds, newsletter, podcast scripts, and admin dashboard.',
    border: 'border-l-teal-400',
  },
  {
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    title: 'Full Documentation',
    description: '17 architecture docs, 90+ implementation plans, deployment guide, and PM repo.',
    border: 'border-l-amber-400',
  },
  {
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
    title: 'Low Cost',
    description: 'Under $85/month total. Hosting, AI, and crawling services.',
    border: 'border-l-indigo-400',
  },
]

const STEWARD_QUALITIES = [
  <>Works in <strong>journalism, civic tech, effective altruism, or international development</strong></>,
  <>Has (or can hire) technical capacity for a <strong>TypeScript + PostgreSQL + OpenAI</strong> stack</>,
  <>Values <strong>editorial transparency</strong> and open methodology</>,
  <>Shares the <strong>non-commercial, public-good orientation</strong></>,
  <>Has existing <strong>audience or distribution channels</strong> that would amplify the service's reach</>,
]

const TECH_STACK = [
  { layer: 'Frontend', tech: 'React 18 + TypeScript + Vite + Tailwind CSS' },
  { layer: 'Backend', tech: 'Express + TypeScript' },
  { layer: 'Database', tech: 'PostgreSQL + pgvector (Prisma ORM)' },
  { layer: 'AI', tech: 'LangChain + OpenAI (structured output with Zod)' },
  { layer: 'Scheduling', tech: 'node-cron (in-process, DB-configured)' },
  { layer: 'Deployment', tech: 'Render.com (easily portable)' },
]

const COSTS = [
  { item: 'Hosting (Render.com)', monthly: '~$15' },
  { item: 'AI pipeline (OpenAI API)', monthly: '~$30\u201360' },
  { item: 'Crawling services', monthly: '~$10' },
]

export default function StewardshipPage() {
  const { data: sources } = useSources()
  const [techOpen, setTechOpen] = useState(false)
  const [costsOpen, setCostsOpen] = useState(false)

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
        <h1 className="page-title">Looking for a Long-Term Home</h1>
        <p className="page-intro text-left max-w-none mx-0 mt-2 mb-6">
          Actually Relevant works. It curates global news daily, runs on a clean codebase, and costs
          less than $85 a month to operate. But it's a side project run by one person, and it
          deserves more than that.
        </p>

        <div className="prose max-w-none">
          <h2 className="section-heading mt-8">What This Is</h2>
          <p>
            This isn't a shutdown notice or an acqui-hire. It's an invitation to discuss
            stewardship: transferring ownership of a working product to an organization better
            positioned to grow it. Like the{' '}
            <a
              href="https://coralproject.net/about-2/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-700 hover:text-brand-800 underline focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
            >
              Coral Project
              <span className="sr-only"> (opens in new tab)</span>
            </a>
            : an open-source journalism tool incubated at Mozilla, then graduated to Vox Media when
            it was ready for a bigger stage.
          </p>
        </div>

        {/* What You'd Receive — 2x2 colored cards, outside .prose */}
        <h2 className="section-heading mt-8">What You'd Receive</h2>
        <p className="text-neutral-600 mt-2 mb-6">
          A fully automated news curation platform
          with{' '}{sources ? `${sources.totalCount}+` : '80+'} sources across multiple languages
          and everything needed to run it.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {RECEIVE_CARDS.map((card) => (
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

        {/* Operating Costs — expandable */}
        <div className="mt-6 border border-neutral-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setCostsOpen(!costsOpen)}
            className="w-full flex items-center justify-between px-5 py-3 text-left bg-neutral-50 hover:bg-neutral-100 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-inset"
            aria-expanded={costsOpen}
          >
            <span className="text-sm font-bold text-neutral-700">Operating costs: ~$55&ndash;85/month</span>
            <ChevronIcon open={costsOpen} className="w-5 h-5 text-neutral-400 shrink-0" />
          </button>
          {costsOpen && (
            <div className="px-5 py-3 border-t border-neutral-200">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    <th scope="col" className="text-left py-2 px-3 font-bold text-neutral-700 border-b border-neutral-200">
                      Item
                    </th>
                    <th scope="col" className="text-left py-2 px-3 font-bold text-neutral-700 border-b border-neutral-200">
                      Monthly
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COSTS.map((row, i) => (
                    <tr key={row.item} className={i % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'}>
                      <td className="py-2 px-3 border-b border-neutral-100 text-neutral-600 align-top">
                        {row.item}
                      </td>
                      <td className="py-2 px-3 border-b border-neutral-100 text-neutral-600 align-top">
                        {row.monthly}
                      </td>
                    </tr>
                  ))}
                  <tr className="font-bold">
                    <td className="py-2 px-3 text-neutral-800 align-top">Total</td>
                    <td className="py-2 px-3 text-neutral-800 align-top">~$55&ndash;85</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Tech Stack — expandable */}
        <div className="mt-3 border border-neutral-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setTechOpen(!techOpen)}
            className="w-full flex items-center justify-between px-5 py-3 text-left bg-neutral-50 hover:bg-neutral-100 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-inset"
            aria-expanded={techOpen}
          >
            <span className="text-sm font-bold text-neutral-700">Tech stack: TypeScript + PostgreSQL + OpenAI</span>
            <ChevronIcon open={techOpen} className="w-5 h-5 text-neutral-400 shrink-0" />
          </button>
          {techOpen && (
            <div className="px-5 py-3 border-t border-neutral-200">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    <th scope="col" className="text-left py-2 px-3 font-bold text-neutral-700 border-b border-neutral-200">
                      Layer
                    </th>
                    <th scope="col" className="text-left py-2 px-3 font-bold text-neutral-700 border-b border-neutral-200">
                      Technology
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {TECH_STACK.map((row, i) => (
                    <tr key={row.layer} className={i % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'}>
                      <td className="py-2 px-3 border-b border-neutral-100 text-neutral-800 font-medium align-top">
                        {row.layer}
                      </td>
                      <td className="py-2 px-3 border-b border-neutral-100 text-neutral-600 align-top">
                        {row.tech}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-sm text-neutral-600 mt-3">
                Strict TypeScript, comprehensive error handling, structured logging, WCAG 2.2 AA
                accessibility, and prerendered HTML for SEO. Production software, not a prototype.
              </p>
            </div>
          )}
        </div>

        <div className="prose max-w-none mt-8">
          <h2 className="section-heading">Who We're Looking For</h2>
          <p>
            The ideal steward is an organization that:
          </p>
          <ul className="list-disc pl-6 space-y-1.5">
            {STEWARD_QUALITIES.map((quality, i) => (
              <li key={i}>{quality}</li>
            ))}
          </ul>
          <p className="mt-4">
            Journalism schools, digital media nonprofits, public interest technology labs, and
            organizations in the Effective Altruism community are all good fits.
          </p>
        </div>

        {/* Divider line */}
        <div className="mt-12 border-t border-neutral-200" />

        {/* Let's Talk — CTA with heart divider + profile, outside .prose */}
        <div className="mt-8 pt-4">
          <div className="flex items-center justify-center gap-4 mb-6">
            <span className="flex-1 border-t border-neutral-200" aria-hidden="true" />
            <HeartIcon className="w-5 h-5 text-brand-300" />
            <span className="flex-1 border-t border-neutral-200" aria-hidden="true" />
          </div>
          <h2 className="text-2xl font-bold mb-6 text-center">Let's Talk</h2>
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <a
              href="https://odins.website"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 self-center sm:self-start focus-visible:ring-2 focus-visible:ring-brand-500 rounded-full"
            >
              <img
                src="/images/optimized/odin-profile-small-w.webp"
                alt="Odin M&#252;hlenbein"
                className="w-20 h-20 rounded-full object-cover ring-2 ring-neutral-200"
              />
            </a>
            <div className="text-left">
              <p className="text-lg text-neutral-600 leading-relaxed">
                If this sounds like a fit for your organization, I'd love to hear from you. No
                formal proposals needed, just reach out and let's have a conversation.
              </p>
              <p className="font-bold text-neutral-800 mt-4">Odin M&uuml;hlenbein</p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm mt-1">
                <Link
                  to="/imprint"
                  className="text-brand-700 hover:text-brand-800 underline focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
                >
                  Email via Impressum
                </Link>
                <span className="text-neutral-300" aria-hidden="true">&middot;</span>
                <a
                  href="https://www.linkedin.com/in/odinmuehlenbein/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-700 hover:text-brand-800 underline focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
                >
                  LinkedIn
                  <span className="sr-only"> (opens in new tab)</span>
                </a>
                <span className="text-neutral-300" aria-hidden="true">&middot;</span>
                <a
                  href="https://odins.website"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-700 hover:text-brand-800 underline focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
                >
                  Website
                  <span className="sr-only"> (opens in new tab)</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
