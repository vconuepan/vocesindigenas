import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { SEO, CommonOgTags } from '../lib/seo'

export default function AboutPage() {
  return (
    <>
      <Helmet>
        <title>About - {SEO.siteName}</title>
        <meta
          name="description"
          content="Actually Relevant surfaces news that matters to humanity. Curated with care by AI."
        />
        <meta property="og:title" content={`About - ${SEO.siteName}`} />
        <meta
          property="og:description"
          content="Actually Relevant surfaces news that matters to humanity. Curated with care by AI."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${SEO.siteUrl}/about`} />
        {CommonOgTags({})}
      </Helmet>

      <div className="page-section">
        <h1 className="page-title">About Actually Relevant</h1>
        <p className="page-intro">
          An AI-curated news platform focused on what truly matters for humanity.
        </p>

        <div className="prose max-w-none">
          <h2 className="section-heading mt-8">The Problem</h2>
          <p>
            Most news sources optimize for clicks, engagement, and advertising revenue.
            The result is a media landscape dominated by sensationalism, celebrity gossip,
            and events that have little lasting impact on humanity. Meanwhile, genuinely
            important developments — in climate science, global health, AI safety, and
            human development — are buried or ignored.
          </p>

          <h2 className="section-heading mt-8">Our Approach</h2>
          <p>
            Actually Relevant takes a different approach. We use AI to evaluate news articles
            based on their genuine relevance to humanity's well-being and long-term future.
            Our system crawls dozens of trusted sources, analyzes every article against a
            rigorous evaluation framework, and publishes only the stories that truly matter.
          </p>
          <p>
            Every story on our site comes with a transparent relevance analysis explaining
            why it matters, what factors contributed to its selection, and what scenarios
            might unfold. We believe informed citizens make better decisions.
          </p>

          <h2 className="section-heading mt-8">What We Cover</h2>
          <p>We focus on four issue areas:</p>
          <ul className="space-y-2 my-4">
            <li>
              <Link to="/issues/existential-threats" className="text-brand-700 hover:text-brand-800 font-normal">
                Existential Threats
              </Link>
              {' '}— Risks that could cause civilizational collapse or human extinction
            </li>
            <li>
              <Link to="/issues/planet-climate" className="text-brand-700 hover:text-brand-800 font-normal">
                Planet &amp; Climate
              </Link>
              {' '}— Climate change, environmental destruction, and biodiversity loss
            </li>
            <li>
              <Link to="/issues/human-development" className="text-brand-700 hover:text-brand-800 font-normal">
                Human Development
              </Link>
              {' '}— Poverty, health, education, and human rights
            </li>
            <li>
              <Link to="/issues/science-technology" className="text-brand-700 hover:text-brand-800 font-normal">
                Science &amp; Technology
              </Link>
              {' '}— Breakthroughs and innovations shaping our future
            </li>
          </ul>

          <h2 className="section-heading mt-8">Learn More</h2>
          <p>
            Read about{' '}
            <Link to="/methodology" className="text-brand-700 hover:text-brand-800 font-normal">
              our methodology
            </Link>{' '}
            to understand how we evaluate relevance, or{' '}
            <Link to="/imprint" className="text-brand-700 hover:text-brand-800 font-normal">
              get in touch
            </Link>{' '}
            if you have questions or suggestions.
          </p>
        </div>
      </div>
    </>
  )
}
