import { Helmet } from 'react-helmet-async'

export default function HomePage() {
  return (
    <>
      <Helmet>
        <title>Actually Relevant - News That Matters</title>
        <meta name="description" content="AI-curated news that matters. We evaluate thousands of articles to surface the stories most relevant to humanity's future." />
      </Helmet>
      <div className="page-section">
        <h1 className="page-title">Actually Relevant</h1>
        <p className="page-intro">
          AI-curated news that matters. We evaluate thousands of articles to surface the stories most relevant to humanity's future.
        </p>
      </div>
    </>
  )
}
