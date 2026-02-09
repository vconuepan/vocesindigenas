import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react'
import { SEO, CommonOgTags } from '../lib/seo'
import { buildBreadcrumbSchema } from '../lib/structured-data'
import StructuredData from '../components/StructuredData'
import LandingCta from '../components/LandingCta'
import { useSources } from '../hooks/useSources'
import { getCategoryColor } from '../lib/category-colors'

const META = {
  title: 'Our Methodology \u2014 How AI Curates the News | Actually Relevant',
  description:
    '82 sources, a multi-stage AI pipeline, and full transparency. Learn exactly how Actually Relevant selects the stories that matter most to humanity.',
  url: `${SEO.siteUrl}/methodology`,
}

const techArticleSchema = {
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  headline: 'Our Methodology \u2014 How AI Curates the News',
  description:
    "Detailed explanation of Actually Relevant's multi-stage AI news curation pipeline, covering 82+ sources across 5 languages.",
  url: META.url,
  author: {
    '@type': 'Organization',
    name: 'Actually Relevant',
    url: SEO.siteUrl,
  },
  about: [
    { '@type': 'Thing', name: 'AI news curation' },
    { '@type': 'Thing', name: 'Algorithmic transparency' },
    { '@type': 'Thing', name: 'News aggregation methodology' },
  ],
}

const breadcrumb = buildBreadcrumbSchema([
  { name: 'Home', url: SEO.siteUrl },
  { name: 'Methodology', url: META.url },
])

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
    </svg>
  )
}

export default function MethodologyPage() {
  const { data: sources, isLoading: sourcesLoading } = useSources()
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
      <StructuredData data={[techArticleSchema, breadcrumb]} />

      <div className="page-section">
        <h1 className="page-title">Our Methodology</h1>
        <div className="prose max-w-none">
          <h2 className="section-heading mt-8">What Does "Relevant" Mean?</h2>
          <p>
            We only feature stories that are important for humanity and its long-term future. Most
            daily news focuses on events that are dramatic, local, or short-lived. We filter for
            stories that affect large numbers of people, shift long-term trends, or represent genuine
            progress in our understanding of the world.
          </p>

          <h2 className="section-heading mt-8">Our Process</h2>
          <p>We use AI to find the most relevant news for you:</p>

          {/* Process funnel */}
          <div className="my-6">
            {/* Legend */}
            <div className="flex items-center gap-1.5 justify-end mb-4 text-xs text-neutral-400">
              <span
                className="w-2.5 h-2.5 rounded-full bg-brand-500 shrink-0"
                aria-hidden="true"
              />
              <span>= story</span>
            </div>

            <div>
              {[
                {
                  label: 'Collection',
                  desc: sources
                    ? `We crawl ${sources.totalCount} curated news sources across five languages and four issue areas. Article content is extracted automatically using a three-tier system that handles different site formats.`
                    : 'We crawl curated news sources across five languages and four issue areas. Article content is extracted automatically using a three-tier system that handles different site formats.',
                  dots: 20,
                },
                {
                  label: 'Pre-screening',
                  desc: 'A large language model reads each article and makes a first-pass judgment: Does this story matter beyond its immediate context? Articles that don\u2019t meet the threshold are filtered out, along with duplicates of the same event.',
                  dots: 10,
                },
                {
                  label: 'Analysis',
                  desc: 'We identify the Issue area that a story belongs to, assess how relevant it is for humanity based on that Issue\u2019s criteria, give a rating, and generate a summary. Ratings consider factors like scale of impact, novelty, policy implications, and humanitarian significance.',
                  dots: 4,
                },
                {
                  label: 'Comparison',
                  desc: 'We compare stories against each other and select the most relevant ones for publication.',
                  dots: 2,
                },
                {
                  label: 'Newsletter curation',
                  desc: 'We identify the 8 most relevant stories of the week, 2 from each Issue.',
                  dots: 1,
                },
              ].map((step) => (
                <div key={step.label} className="flex gap-4 md:gap-6 items-center py-3">
                  <div className="flex-1">
                    <strong className="text-neutral-800">{step.label}</strong>
                    <p className="text-sm text-neutral-500 mt-1 leading-relaxed">{step.desc}</p>
                  </div>
                  {/* Dot cluster — fewer stories = stronger color */}
                  <div
                    className="w-16 md:w-20 shrink-0 flex flex-wrap justify-end gap-[5px]"
                    role="img"
                    aria-label={`~${step.dots} stories remaining`}
                  >
                    {Array.from({ length: step.dots }).map((_, j) => (
                      <span
                        key={j}
                        className="w-2.5 h-2.5 rounded-full bg-brand-500"
                        style={{ opacity: 0.25 + 0.75 * (1 - step.dots / 20) }}
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <h2 className="section-heading mt-8">Issue Areas</h2>
          <p>
            We cover four main issue areas, each with adapted evaluation criteria. Some areas have
            subcategories with further adjusted criteria.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          {[
            { slug: 'human-development', title: 'Human Development', description: 'Poverty, health, education, migration, human rights' },
            { slug: 'planet-climate', title: 'Planet & Climate', description: 'Climate change, biodiversity, ecosystems, energy' },
            { slug: 'existential-threats', title: 'Existential Threats', description: 'Nuclear weapons, pandemics, AI risks, conflict' },
            { slug: 'science-technology', title: 'Science & Technology', description: 'Research breakthroughs, innovation, AI policy' },
          ].map((card) => {
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
        <div className="prose max-w-none">

          {/* Our Sources */}
          <h2 className="section-heading mt-10">Our Sources</h2>
          <p>
            We monitor{sources ? ` ${sources.totalCount}` : ''} curated publications. Every source
            is chosen for editorial quality, regional coverage, or subject-matter expertise — not
            for traffic volume.
          </p>

          {sourcesLoading ? (
            <div className="space-y-3 mt-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-5 bg-neutral-100 rounded animate-pulse" />
              ))}
            </div>
          ) : sources ? (
            <div className="mt-6 space-y-2">
              <Disclosure as="div" className="border border-neutral-200 rounded-lg">
                <DisclosureButton className="flex w-full items-center justify-between px-5 py-4 text-left font-bold text-neutral-800 hover:bg-neutral-50 transition-colors rounded-lg focus-visible:ring-2 focus-visible:ring-brand-500">
                  By Region
                  <ChevronIcon className="w-5 h-5 text-neutral-400 data-[open]:rotate-180 transition-transform shrink-0" />
                </DisclosureButton>
                <DisclosurePanel className="px-5 pb-4 space-y-2">
                  {Object.entries(sources.byRegion).map(([region, names]) => (
                    <p key={region} className="text-sm">
                      <strong>{region}:</strong> {names.join(', ')}
                    </p>
                  ))}
                </DisclosurePanel>
              </Disclosure>

              <Disclosure as="div" className="border border-neutral-200 rounded-lg">
                <DisclosureButton className="flex w-full items-center justify-between px-5 py-4 text-left font-bold text-neutral-800 hover:bg-neutral-50 transition-colors rounded-lg focus-visible:ring-2 focus-visible:ring-brand-500">
                  By Issue Area
                  <ChevronIcon className="w-5 h-5 text-neutral-400 data-[open]:rotate-180 transition-transform shrink-0" />
                </DisclosureButton>
                <DisclosurePanel className="px-5 pb-4 space-y-2">
                  {Object.entries(sources.byIssue).map(([issue, names]) => (
                    <p key={issue} className="text-sm">
                      <strong>{issue}</strong> — {names.join(', ')}
                    </p>
                  ))}
                </DisclosurePanel>
              </Disclosure>
            </div>
          ) : null}

          {/* What We Don't Do */}
          <h2 className="section-heading mt-10">What We Don't Do</h2>
          <ul className="list-disc pl-6 space-y-2 mt-3">
            <li>
              <strong>We don't personalize.</strong> Everyone sees the same stories. There's no
              filter bubble.
            </li>
            <li>
              <strong>We don't optimize for clicks.</strong> No engagement metrics influence
              selection.
            </li>
            <li>
              <strong>We don't do original reporting.</strong> Every story links to the original
              source article. Summaries, blurbs, and relevance analyses are AI-generated and clearly
              labeled as such.
            </li>
            <li>
              <strong>We don't sell data.</strong> No tracking, no analytics profiles, no ad
              targeting.
            </li>
          </ul>

          {/* The Positivity Slider */}
          <h2 className="section-heading mt-10">The Positivity Dial</h2>
          <p>
            Readers can adjust a 5-position positivity dial that filters stories by emotional tone.
            This doesn't change what we select — it lets you control how much difficult news you see
            in a given session. It's a tool for managing news fatigue, not an editorial filter.
          </p>
          <p className="mt-2">
            <Link
              to="/news-fatigue"
              className="text-brand-700 hover:text-brand-800 underline focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
            >
              Learn more about our approach to news fatigue{' '}
            </Link>
          </p>

          {/* Transparency */}
          <h2 className="section-heading mt-10">Transparency</h2>
          <p>
            For every published story, we show the AI-generated analysis: why the story matters, what
            factors contributed to its rating, and potential caveats. We believe readers deserve to
            understand not just <em>what</em> is relevant, but <em>why</em>.
          </p>
          <p className="mt-4">
            AI curation is only trustworthy if you can verify it. We name our sources, explain our
            pipeline, and publish an open API so anyone can inspect what we produce.
          </p>
          <p className="mt-2">
            <Link
              to="/compare"
              className="text-brand-700 hover:text-brand-800 underline focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
            >
              See how we compare to other aggregators{' '}
            </Link>
            {' | '}
            <Link
              to="/free-api"
              className="text-brand-700 hover:text-brand-800 underline focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
            >
              Explore the free API
            </Link>
          </p>
        </div>

        <LandingCta
          heading="See it in action."
          description="Visit actuallyrelevant.news to read today's curated stories — or subscribe to the newsletter."
        />
      </div>
    </>
  )
}
