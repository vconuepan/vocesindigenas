import { type ReactNode, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SEO, CommonOgTags } from '../lib/seo'
import { buildBreadcrumbSchema } from '../lib/structured-data'
import StructuredData from '../components/StructuredData'
import LandingCta from '../components/LandingCta'
import { publicApi } from '../lib/api'
import type { RegionStat } from '../lib/api'

const META = {
  title: 'Google News Alternatives Compared \u2014 Impacto Ind\u00edgena',
  description:
    'Side-by-side comparison of Google News, Flipboard, Ground News, News Minimalist, and more. See how AI curation, privacy, source transparency, and cost stack up.',
  url: `${SEO.siteUrl}/compare`,
}

const COMPETITORS = ['Google News', 'Flipboard', 'Ground News', 'News Minimalist', 'Feedly', 'SmartNews']

type CellValue = string | { text: string; check?: boolean }

function getCellText(cell: CellValue): string {
  return typeof cell === 'string' ? cell : cell.text
}

function getCellCheck(cell: CellValue): boolean {
  return typeof cell !== 'string' && !!cell.check
}

function CellContent({ cell }: { cell: CellValue }) {
  const text = getCellText(cell)
  const check = getCellCheck(cell)
  return (
    <>
      {check && (
        <svg
          className="inline-block w-4 h-4 text-green-600 mr-1 -mt-0.5 shrink-0"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      )}
      {text}
    </>
  )
}

// Each row: us = Impacto Indígena cell, them = one cell per competitor (same order as COMPETITORS)
// Sources: pm/references/marketing/competitors/*.md
const ROWS: { us: CellValue; them: CellValue[] }[] = [
  {
    us: { text: 'Multi-stage AI curation', check: true },
    them: [
      'ML-personalized by interest and location',
      'Hybrid human + AI, 20 curators',
      'Story clustering + third-party bias ratings',
      { text: 'GPT-4 significance scoring', check: true },
      'Leo AI assistant (Pro+ only, $8.25/mo)',
      'AI + human editors',
    ],
  },
  {
    us: { text: 'Only what matters to humanity', check: true },
    them: [
      'General, personalized by user behavior',
      '30,000+ topics, lifestyle-heavy',
      'General with bias/perspective focus',
      'General, significance-filtered',
      'User-defined (any RSS source)',
      'General + local news',
    ],
  },
  {
    us: { text: 'All sources named publicly', check: true },
    them: [
      'Sources named, algorithm proprietary',
      'Sources named, publisher list not public',
      { text: 'Bias ratings from AllSides / Ad Fontes / MBFC', check: true },
      { text: 'Sources named, scoring criteria public', check: true },
      { text: 'User selects all sources', check: true },
      'Sources named, algorithm proprietary',
    ],
  },
  {
    us: { text: 'No ads', check: true },
    them: [
      { text: 'No ads in feed', check: true },
      'Native ads in feed',
      { text: 'No ads (subscription-funded)', check: true },
      { text: 'No ads', check: true },
      { text: 'No ads (freemium)', check: true },
      'Native + video ads',
    ],
  },
  {
    us: { text: 'No tracking', check: true },
    them: [
      'Google account + cross-product tracking',
      'Device data + ad targeting',
      'Account-based, limited details public',
      'Newsletter platform includes ad pixels',
      'Standard SaaS analytics',
      'Cross-device + geolocation',
    ],
  },
  {
    us: { text: 'AI summary for every story', check: true },
    them: [
      'Headlines + snippets',
      'Headlines + image previews',
      'Multi-source headlines + bias breakdown',
      { text: 'Brief summary + significance score ($15/mo for extended)', check: true },
      'Summaries via Leo (paid only)',
      'Headlines + snippets',
    ],
  },
  {
    us: { text: 'Multi-factor relevance analysis', check: true },
    them: [
      'Proprietary ranking, no public score',
      'No public score',
      'Coverage volume + bias score',
      { text: '0\u201310 significance score (4 criteria)', check: true },
      'Leo prioritization (paid, user-trained)',
      'No public score',
    ],
  },
  {
    us: { text: 'Free API, no key required', check: true },
    them: [
      'Shut down in 2011',
      'No',
      'No',
      'No',
      'Limited dev API (250 requests)',
      'Advertiser API only',
    ],
  },
  {
    us: { text: 'RSS feeds', check: true },
    them: [
      'Unofficial, unsupported',
      { text: 'Magazine RSS available', check: true },
      { text: 'Via Open RSS', check: true },
      { text: 'Via newsletter platform', check: true },
      'N/A (is an RSS reader)',
      'No',
    ],
  },
  {
    us: { text: 'Methodology published', check: true },
    them: [
      'High-level principles only',
      'High-level blog posts only',
      { text: 'Bias rating methodology documented', check: true },
      { text: 'Scoring criteria + threshold documented', check: true },
      'Leo features documented, algorithms not',
      'Undocumented',
    ],
  },
]

const DIFFERENTIATORS: { icon: ReactNode; title: string; description: string; border: string }[] = [
  {
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
      </svg>
    ),
    title: 'Significance Over Engagement',
    description:
      'AI selects 10\u201320 stories daily by real-world importance, not click potential.',
    border: 'border-l-brand-400',
  },
  {
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Global Coverage',
    description:
      '82+ sources across five languages, including regions most aggregators ignore.',
    border: 'border-l-teal-400',
  },
  {
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
      </svg>
    ),
    title: 'No Ads, No Tracking',
    description:
      'No ads, no cookies, no third-party trackers. Privacy-first analytics only.',
    border: 'border-l-amber-400',
  },
  {
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
    title: 'Non-Commercial',
    description:
      'Donation-supported, no investors, no engagement metrics. Built to inform, not monetize.',
    border: 'border-l-indigo-400',
  },
]

const PERSONAS: { title: string; description: string; link: string; linkText: string; border: string }[] = [
  {
    title: 'News-fatigued readers',
    description: 'Fewer, better stories instead of an endless scroll.',
    link: '/news-fatigue',
    linkText: 'Our approach',
    border: 'border-l-brand-400',
  },
  {
    title: 'Developers and organizations',
    description: 'Curated news data without building your own pipeline.',
    link: '/free-api',
    linkText: 'Explore the free API',
    border: 'border-l-teal-400',
  },
  {
    title: 'Privacy-conscious readers',
    description: 'No ads, no tracking, no data harvesting.',
    link: '/no-ads-no-tracking',
    linkText: 'Our commitment',
    border: 'border-l-amber-400',
  },
  {
    title: 'Globally minded readers',
    description: 'Coverage beyond Western headlines.',
    link: '/methodology',
    linkText: 'Sources and methodology',
    border: 'border-l-indigo-400',
  },
]

const pageSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: META.title,
  description: 'Side-by-side comparison of news aggregators including Google News, Flipboard, Ground News, and more.',
  url: META.url,
  mainEntity: {
    '@type': 'Table',
    about: 'News aggregator comparison',
  },
}

const breadcrumb = buildBreadcrumbSchema([
  { name: 'Home', url: SEO.siteUrl },
  { name: 'Compare', url: META.url },
])

export default function ComparePage() {
  const [competitor, setCompetitor] = useState('Google News')
  const idx = COMPETITORS.indexOf(competitor)

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
        <h1 className="page-title">How Does Impacto Indígena Compare?</h1>
        <p className="text-lg text-neutral-600 leading-relaxed">
          Most news aggregators optimize for engagement. More clicks, more time on site, more ad
          impressions. Impacto Indígena does something different: it uses AI to find the stories
          that matter most to humanity, with no ads, no tracking, and full source transparency.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
          {DIFFERENTIATORS.map((card) => (
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

        {/* Comparison table — 2-column, AR vs selected competitor */}
        <h2 className="section-heading mt-12">Side-by-Side Comparison</h2>
        <table className="w-full text-sm border-collapse mt-6 table-fixed">
          <thead>
            <tr>
              <th className="w-1/2 text-left py-3 px-4 font-bold bg-brand-50 text-brand-800 border-b border-brand-200 rounded-tl-lg">
                Impacto Indígena
              </th>
              <th className="w-1/2 text-left py-3 px-4 font-bold bg-neutral-50 text-neutral-700 border-b border-neutral-300 rounded-tr-lg">
                <select
                  value={competitor}
                  onChange={(e) => setCompetitor(e.target.value)}
                  className="font-bold text-sm bg-transparent text-neutral-700 border-none outline-none cursor-pointer underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-500 focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
                  aria-label="Select competitor to compare"
                >
                  {COMPETITORS.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'}>
                <td className="py-2.5 px-4 border-b border-neutral-200 text-neutral-800 font-medium">
                  <CellContent cell={row.us} />
                </td>
                <td className="py-2.5 px-4 border-b border-neutral-200 text-neutral-600">
                  <CellContent cell={row.them[idx]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-neutral-400 mt-2">As of February 2026.</p>

        {/* Who We're Best For — colored cards */}
        <h2 className="section-heading mt-12">Who We're Best For</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          {PERSONAS.map((card) => (
            <div
              key={card.title}
              className={`bg-white border border-neutral-200 ${card.border} border-l-4 rounded-lg p-5`}
            >
              <h3 className="font-bold text-neutral-800 mb-1">{card.title}</h3>
              <p className="text-sm text-neutral-600 leading-relaxed">
                {card.description}{' '}
                <Link to={card.link} className="text-brand-800 hover:text-brand-700 underline focus-visible:ring-2 focus-visible:ring-brand-500 rounded">
                  {card.linkText}
                </Link>
              </p>
            </div>
          ))}
        </div>

        <CoverageSection />

        <LandingCta
          heading="Ready to try news that's actually relevant?"
          description="Visit impactoindigena.news or subscribe to the newsletter for a curated digest in your inbox."
        />
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Coverage stats section
// ---------------------------------------------------------------------------

function RelevanceBar({ value, max = 10 }: { value: number; max?: number }) {
  const pct = Math.round((value / max) * 100)
  const color = value >= 6.5 ? 'bg-brand-600' : value >= 5 ? 'bg-amber-400' : 'bg-neutral-300'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-medium text-neutral-700 w-8 text-right">{value.toFixed(1)}</span>
    </div>
  )
}

function CoverageSection() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['coverage-stats'],
    queryFn: () => publicApi.coverage(),
    staleTime: 60 * 60 * 1000,
  })

  const rows = data?.byRegion.filter((r: RegionStat) => r.storyCount > 0) ?? []

  return (
    <section className="mt-16">
      <h2 className="section-heading">Coverage by Region</h2>
      <p className="text-neutral-600 mt-2 mb-6 text-sm leading-relaxed max-w-2xl">
        Impacto Indígena indexes {data?.totalFeeds ?? '—'} active sources across {rows.length} regions.
        Average relevance scores reflect how well each region's media covers indigenous and human rights topics
        — higher scores mean more focused, substantive coverage.
      </p>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 rounded-lg bg-neutral-100 animate-pulse" />
          ))}
        </div>
      )}

      {isError && (
        <p className="text-sm text-neutral-400 italic">Coverage data temporarily unavailable.</p>
      )}

      {!isLoading && !isError && rows.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-lg border border-neutral-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wide">Region</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-600 uppercase tracking-wide w-20">Sources</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-600 uppercase tracking-wide w-24">Stories (30d)</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wide w-48">Avg Relevance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row: RegionStat) => (
                  <tr key={row.region} className="border-b border-neutral-100 hover:bg-neutral-50">
                    <td className="px-4 py-3 font-medium text-neutral-800">{row.label}</td>
                    <td className="px-4 py-3 text-right text-neutral-500">{row.feedCount}</td>
                    <td className="px-4 py-3 text-right text-neutral-700 font-medium">{row.storyCount}</td>
                    <td className="px-4 py-3">
                      {row.avgRelevance != null
                        ? <RelevanceBar value={row.avgRelevance} />
                        : <span className="text-neutral-300 text-xs">—</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-neutral-400 mt-2">
            Relevance scored 1–10 by AI against indigenous and human rights topics. Last {data?.periodDays} days.
          </p>
        </>
      )}
    </section>
  )
}
