import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { SEO, CommonOgTags } from '../lib/seo'

export default function MethodologyPage() {
  return (
    <>
      <Helmet>
        <title>Methodology - {SEO.siteName}</title>
        <meta
          name="description"
          content="How we evaluate news relevance using AI. Each issue area has its own evaluation criteria, and a multi-stage pipeline filters for what truly matters."
        />
        <meta property="og:title" content={`Methodology - ${SEO.siteName}`} />
        <meta
          property="og:description"
          content="How we evaluate news relevance using AI. Each issue area has its own evaluation criteria, and a multi-stage pipeline filters for what truly matters."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${SEO.siteUrl}/methodology`} />
        {CommonOgTags({})}
      </Helmet>

      <div className="page-section">
        <h1 className="page-title">Our Methodology</h1>
        <div className="prose max-w-none">
          <h2 className="section-heading mt-8">What Does "Relevant" Mean?</h2>
          <p>
            We only feature stories that are important for humanity and its long-term future.
            Most daily news focuses on events that are dramatic, local, or short-lived. We filter
            for stories that affect large numbers of people, shift long-term trends, or represent
            genuine progress in our understanding of the world.
          </p>

          <h2 className="section-heading mt-8">Our Process</h2>
          <p>
            We use AI to find the most relevant news for you:
          </p>

          {/* Process funnel */}
          <div className="my-6">
            {/* Legend */}
            <div className="flex items-center gap-1.5 justify-end mb-4 text-xs text-neutral-400">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-500 shrink-0" aria-hidden="true" />
              <span>= story</span>
            </div>

            <div>
              {[
                {
                  label: 'Collection',
                  desc: 'We crawl over 50 curated news sources across our four Issue areas, extracting article content automatically.',
                  dots: 20,
                },
                {
                  label: 'Pre-screening',
                  desc: 'Articles that clearly don\u2019t meet our criteria are filtered out.',
                  dots: 10,
                },
                {
                  label: 'Analysis',
                  desc: 'We identify the Issue area that a story belongs to, assess how relevant it is for humanity based on that Issue\u2019s criteria, give a rating, and generate a summary.',
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
                  <div className="w-16 md:w-20 shrink-0 flex flex-wrap justify-end gap-[5px]" aria-label={`~${step.dots} stories remaining`}>
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
            We cover four Issue areas, each with adapted evaluation criteria:
          </p>
          <ul className="space-y-2 my-4">
            <li>
              <Link to="/issues/existential-threats" className="text-brand-700 hover:text-brand-800 font-medium">
                Existential Threats
              </Link>
              {' '}— Nuclear weapons, pandemics, AI risks
            </li>
            <li>
              <Link to="/issues/planet-climate" className="text-brand-700 hover:text-brand-800 font-medium">
                Planet &amp; Climate
              </Link>
              {' '}— Climate change, biodiversity, ecosystems
            </li>
            <li>
              <Link to="/issues/human-development" className="text-brand-700 hover:text-brand-800 font-medium">
                Human Development
              </Link>
              {' '}— Poverty, health, education, rights
            </li>
            <li>
              <Link to="/issues/science-technology" className="text-brand-700 hover:text-brand-800 font-medium">
                Science &amp; Technology
              </Link>
              {' '}— Research breakthroughs, innovation
            </li>
          </ul>

          <h2 className="section-heading mt-8">Transparency</h2>
          <p>
            For every published story, we show the AI-generated analysis: why the story
            matters, what factors contributed to its rating, and potential caveats. We
            believe readers deserve to understand not just <em>what</em>{' '}
            is relevant, but <em>why</em>.
          </p>
        </div>
      </div>
    </>
  )
}
