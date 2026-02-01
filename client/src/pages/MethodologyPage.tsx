import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'

export default function MethodologyPage() {
  return (
    <>
      <Helmet>
        <title>Methodology - Actually Relevant</title>
        <meta
          name="description"
          content="How we evaluate news relevance using AI. Each issue area has its own evaluation criteria, and a multi-stage pipeline filters for what truly matters."
        />
        <meta property="og:title" content="Methodology - Actually Relevant" />
        <meta
          property="og:description"
          content="How we evaluate news relevance using AI. Each issue area has its own evaluation criteria, and a multi-stage pipeline filters for what truly matters."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://actuallyrelevant.news/methodology" />
        <meta property="og:image" content="https://actuallyrelevant.news/images/logo-text-square.jpg" />
      </Helmet>

      <div className="page-section">
        <h1 className="page-title">Our Methodology</h1>
        <p className="page-intro">
          How we decide what news actually matters for humanity.
        </p>

        <div className="prose max-w-none">
          <h2 className="section-heading mt-8">What Does "Relevant" Mean?</h2>
          <p>
            We only feature stories that are important for humanity and its long-term future.
            Most daily news focuses on events that are dramatic, local, or short-lived. We filter
            for stories that affect large numbers of people, shift long-term trends, or represent
            genuine progress in our understanding of the world.
          </p>

          <h2 className="section-heading mt-8">Issue-Specific Evaluation Criteria</h2>
          <p>
            Each issue area defines its own evaluation criteria tailored to what matters
            most in that domain. Stories are scored against these criteria on a 1–10 scale.
          </p>
          <p>
            For example, stories in the{' '}
            <Link to="/issues/human-development" className="text-brand-700 hover:text-brand-800 font-medium">
              Human Development
            </Link>
            {' '}issue are evaluated on:
          </p>
          <ol className="list-decimal list-inside space-y-4 my-4 text-neutral-600">
            <li className="leading-relaxed">
              The number of people directly affected in terms of their basic human needs
              (nutrition, shelter), foundations of wellbeing (healthcare, schooling), and
              opportunities (personal rights, equal access)
            </li>
            <li className="leading-relaxed">
              Changes in social, political, economic, and legal trends, norms, and systems
              that have an ongoing effect on people's access to basic needs, wellbeing, and
              opportunities
            </li>
            <li className="leading-relaxed">
              Technological advancements or innovations that affect access to basic needs,
              foundations of wellbeing, and opportunities
            </li>
          </ol>
          <p>
            You can see the full evaluation criteria for each issue on its dedicated page.
          </p>

          <h2 className="section-heading mt-8">How AI Analysis Works</h2>
          <p>
            We use a multi-stage AI pipeline to evaluate every article we collect:
          </p>
          <ol className="list-decimal list-inside space-y-4 my-4 text-neutral-600">
            <li className="leading-relaxed">
              <strong>Collection</strong> — We crawl dozens of curated news sources across
              our four issue areas, extracting article content automatically.
            </li>
            <li className="leading-relaxed">
              <strong>Pre-screening</strong> — Each article is assigned to the issue it
              best belongs to and receives a quick assessment to determine whether it
              merits a full evaluation. Articles below a minimum relevance threshold are
              filtered out.
            </li>
            <li className="leading-relaxed">
              <strong>Full analysis</strong> — Qualifying articles receive detailed
              evaluation: relevance factors and antifactors are identified, a rating is
              assigned, and a summary is generated.
            </li>
            <li className="leading-relaxed">
              <strong>Selection</strong> — From the pool of worthy candidates, the
              most relevant stories are selected for publication.
            </li>
          </ol>

          <h2 className="section-heading mt-8">Issue Areas</h2>
          <p>
            We cover four issue areas, each with adapted evaluation criteria:
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
