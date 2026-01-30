import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { usePublicIssues } from '../hooks/usePublicIssues'
import type { PublicIssue } from '../lib/api'

function IssueCard({ issue }: { issue: PublicIssue }) {
  return (
    <section className="border border-neutral-200 rounded-lg overflow-hidden">
      {/* Header with link */}
      <div className="bg-brand-50 px-6 py-5 md:px-8 md:py-6">
        <Link
          to={`/issues/${issue.slug}`}
          className="group focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
        >
          <h2 className="text-2xl md:text-3xl font-bold group-hover:text-brand-700 transition-colors">
            {issue.name}
          </h2>
        </Link>
        <p className="text-neutral-700 leading-relaxed mt-3">{issue.intro || issue.description}</p>
      </div>

      <div className="px-6 py-5 md:px-8 md:py-6 space-y-6">
        {/* Child issues */}
        {issue.children && issue.children.length > 0 && (
          <div>
            <h3 className="text-lg font-bold mb-2">Sub-topics</h3>
            <div className="flex flex-wrap gap-2">
              {issue.children.map(child => (
                <Link
                  key={child.slug}
                  to={`/issues/${child.slug}`}
                  className="bg-brand-50 text-brand-700 hover:bg-brand-100 text-sm font-medium px-3 py-1.5 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  {child.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* How we evaluate */}
        {issue.evaluationCriteria?.length > 0 && (
          <div>
            <h3 className="text-lg font-bold mb-2">How We Evaluate</h3>
            {issue.evaluationIntro && (
              <p className="text-sm text-neutral-500 mb-3">{issue.evaluationIntro}</p>
            )}
            <ol className="list-decimal list-inside space-y-2 text-sm text-neutral-600">
              {issue.evaluationCriteria.map((criterion, i) => (
                <li key={i} className="leading-relaxed">{criterion}</li>
              ))}
            </ol>
          </div>
        )}

        {/* Sources */}
        {issue.sourceNames?.length > 0 && (
          <div>
            <h3 className="text-lg font-bold mb-2">Sample Sources We Cover</h3>
            <div className="flex flex-wrap gap-1.5">
              {issue.sourceNames.map((source) => (
                <span
                  key={source}
                  className="bg-neutral-100 text-neutral-600 text-xs px-2.5 py-1 rounded-full"
                >
                  {source}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Make a difference */}
        {issue.makeADifference?.length > 0 && (
          <div>
            <h3 className="text-lg font-bold mb-2">Make a Difference</h3>
            <ul className="flex flex-wrap gap-x-4 gap-y-1">
              {issue.makeADifference.map((link) => (
                <li key={link.url}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-brand-700 hover:text-brand-800 font-medium underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* View stories link */}
        <div className="pt-2 border-t border-neutral-100">
          <Link
            to={`/issues/${issue.slug}`}
            className="text-brand-700 hover:text-brand-800 font-medium text-sm focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-1"
          >
            View {issue.name} stories &rarr;
          </Link>
        </div>
      </div>
    </section>
  )
}

export default function IssuesPage() {
  const { data: issues, isLoading } = usePublicIssues()

  return (
    <>
      <Helmet>
        <title>Issues - Actually Relevant</title>
        <meta
          name="description"
          content="We cover issue areas critical to humanity's future, each evaluated with a rigorous framework."
        />
        <meta property="og:title" content="Issues - Actually Relevant" />
        <meta property="og:description" content="We cover issue areas critical to humanity's future." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://actuallyrelevant.news/issues" />
        <meta property="og:image" content="https://actuallyrelevant.news/images/logo-text-square.jpg" />
      </Helmet>

      <div className="page-section-wide">
        <h1 className="page-title">Our Issues</h1>
        <p className="page-intro">
          We only feature stories that are important for humanity and its long-term future.
          We believe that every story on our website will be more relevant to humanity than
          90% of the stories in your daily newspaper.
        </p>

        {isLoading && <p className="text-center text-neutral-500 py-12">Loading...</p>}

        <div className="space-y-8">
          {(issues ?? []).map((issue) => (
            <IssueCard key={issue.slug} issue={issue} />
          ))}
        </div>
      </div>
    </>
  )
}
