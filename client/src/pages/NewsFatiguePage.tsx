import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { SEO, CommonOgTags } from '../lib/seo'
import { buildBreadcrumbSchema } from '../lib/structured-data'
import StructuredData from '../components/StructuredData'
import LandingCta from '../components/LandingCta'
import { getCategoryColor } from '../lib/category-colors'

const META = {
  title: 'News Fatigue Is a Design Problem \u2014 Here\u2019s a Better Way | Impacto Indígena',
  description:
    'Nearly 40% of people actively avoid the news. The problem isn\u2019t you \u2014 it\u2019s how news is delivered. A curated digest of 10-20 stories that matter, with no noise.',
  url: `${SEO.siteUrl}/news-fatigue`,
}

const pageSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'News Fatigue Is a Design Problem \u2014 Here\u2019s a Better Way',
  description: META.description,
  url: META.url,
  author: {
    '@type': 'Organization',
    name: 'Impacto Indígena',
    url: SEO.siteUrl,
  },
  about: [
    { '@type': 'Thing', name: 'News fatigue' },
    { '@type': 'Thing', name: 'News avoidance' },
    { '@type': 'Thing', name: 'Media literacy' },
  ],
}

const breadcrumb = buildBreadcrumbSchema([
  { name: 'Home', url: SEO.siteUrl },
  { name: 'News Fatigue', url: META.url },
])

const PROBLEM_CARDS = [
  {
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    title: 'Volume overload',
    description: 'Hundreds of stories per day, most of them noise. No signal, no stopping point.',
  },
  {
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
      </svg>
    ),
    title: 'Negativity bias',
    description: 'Outrage and fear drive clicks. Progress and nuance don\u2019t.',
  },
  {
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Infinite scroll',
    description: 'No natural stopping point. You either doom-scroll or force yourself to quit.',
  },
  {
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    title: 'Guilt cycle',
    description: 'Avoid the news \u2192 feel uninformed \u2192 try again \u2192 get overwhelmed \u2192 repeat.',
  },
]

const APPROACH_CARDS = [
  {
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
      </svg>
    ),
    title: 'Fewer, Better Stories',
    description:
      'AI reads 82+ sources and selects 10\u201320 stories by real-world significance. No filler, no rage-bait.',
    border: 'border-l-brand-400',
  },
  {
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'A Natural Stopping Point',
    description:
      'When you\u2019ve read today\u2019s curated stories, you\u2019re done. No infinite feed, no algorithmic rabbit holes. You get informed and move on.',
    border: 'border-l-teal-400',
  },
  {
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    title: 'The Positivity Dial',
    description:
      'A 5-position dial lets you filter stories by emotional tone. You control what you see, not an algorithm.',
    border: 'border-l-amber-400',
  },
  {
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Global Coverage',
    description:
      'Instead of the same Western-centric stories recycled everywhere, you\u2019ll see reporting from Sub-Saharan Africa, Southeast Asia, Latin America, and the Middle East.',
    border: 'border-l-indigo-400',
  },
]

const ISSUE_CARDS = [
  {
    slug: 'human-development',
    title: 'Human Development',
    description: 'Health, migration, poverty, education, human rights',
  },
  {
    slug: 'planet-climate',
    title: 'Planet & Climate',
    description: 'Climate change, biodiversity, energy, environment',
  },
  {
    slug: 'existential-threats',
    title: 'Existential Threats',
    description: 'Nuclear risk, conflict, AI safety',
  },
  {
    slug: 'science-technology',
    title: 'Science & Technology',
    description: 'Research breakthroughs, innovation, AI policy',
  },
]

export default function NewsFatiguePage() {
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
        <h1 className="page-title">You're Not Avoiding the News Because You Don't Care</h1>
        <div className="prose max-w-none">
          <p className="text-lg text-neutral-600 leading-relaxed">
            You care about the world. Climate change, global health, conflicts that affect
            millions — you know these things matter. But every time you open a news app, you're hit
            with walls of outrage, clickbait, and an algorithm designed to keep you scrolling. So you
            close it. And then you feel guilty for not staying informed.
          </p>
          <p>
            You're not alone. According to the{' '}
            <a href="https://reutersinstitute.politics.ox.ac.uk/digital-news-report/2024" target="_blank" rel="noopener noreferrer">
              Reuters Institute
            </a>
            , nearly 40% of people now actively avoid the news. Not because they're apathetic —
            because the way news is delivered is exhausting.
          </p>
        </div>

        {/* The Problem — 2x2 card grid */}
        <h2 className="section-heading mt-10">
          The Problem Isn't the News. It's the Delivery.
        </h2>
        <p className="text-neutral-600 mt-2 leading-relaxed">
          Traditional news platforms sell ads, which means they need your attention, which means
          they need to trigger emotional reactions. The result:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          {PROBLEM_CARDS.map((card) => (
            <div
              key={card.title}
              className="bg-neutral-50 rounded-xl border border-neutral-200 p-6"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-neutral-500">{card.icon}</span>
                <h3 className="font-bold text-neutral-800">{card.title}</h3>
              </div>
              <p className="text-sm text-neutral-600 leading-relaxed">{card.description}</p>
            </div>
          ))}
        </div>

        {/* A Different Approach — feature cards */}
        <h2 className="section-heading mt-12">A Different Approach</h2>
        <p className="text-neutral-600 mt-2 leading-relaxed">
          Impacto Indígena is built around a simple idea: what if you could stay informed about
          the things that matter without the noise?
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          {APPROACH_CARDS.map((card) => (
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

        {/* What Staying Informed Looks Like */}
        <h2 className="section-heading mt-12">Stay Informed in 5 Minutes</h2>
        <p className="text-neutral-600 mt-3 leading-relaxed">
          Open Impacto Indígena or the newsletter. Scan 10–20 curated stories organized by
          issue area. Read the ones that interest you — each links to the original source. Done.
          Five minutes, and you're genuinely informed about what happened in the world today.
        </p>

        {/* Built for People Who Care — issue cards */}
        <h2 className="section-heading mt-12">Built for People Who Care</h2>
        <p className="text-neutral-600 mt-2 leading-relaxed">
          We focus on four issue areas that define our era, deliberately skipping celebrity news,
          sports, stock picks, and partisan commentary. If these are the things you worry about
          when you avoid the news, this is the digest built for you.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          {ISSUE_CARDS.map((card) => {
            const colors = getCategoryColor(card.slug)
            return (
              <Link
                key={card.slug}
                to={`/issues/${card.slug}`}
                className="block bg-white border border-neutral-200 border-t-4 rounded-lg p-5 hover:shadow-md transition-shadow focus-visible:ring-2 focus-visible:ring-brand-500 no-underline"
                style={{ borderTopColor: colors.hex }}
              >
                <h3 className="font-bold text-neutral-800 mb-1">{card.title}</h3>
                <p className="text-sm text-neutral-600">{card.description}</p>
              </Link>
            )
          })}
        </div>

        {/* No Tricks, No Traps */}
        <h2 className="section-heading mt-12">No Tricks, No Traps</h2>
        <div className="prose max-w-none">
          <ul className="list-disc pl-6 space-y-2 mt-3">
            <li>
              <strong>No ads.</strong> No revenue depends on keeping you engaged.{' '}
              <Link to="/no-ads-no-tracking" className="text-brand-800 hover:text-brand-700 underline focus-visible:ring-2 focus-visible:ring-brand-500 rounded">
                Read our commitment
              </Link>
            </li>
            <li>
              <strong>No tracking.</strong> No cookies, no analytics profiles, no third-party
              trackers.
            </li>
            <li>
              <strong>No personalization bubbles.</strong> Everyone sees the same curated stories.
            </li>
            <li>
              <strong>Non-commercial.</strong> This is a social-good project, not a media business.
            </li>
          </ul>
          <p className="mt-4">
            <Link to="/methodology" className="text-brand-800 hover:text-brand-700 underline focus-visible:ring-2 focus-visible:ring-brand-500 rounded">
              See how we select stories            </Link>
          </p>
        </div>

        <LandingCta
          heading="Stay informed without the burnout."
          description="Visit impactoindigena.news for today's stories — or get the digest delivered to your inbox."
        />
      </div>
    </>
  )
}
