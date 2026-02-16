import { Helmet } from 'react-helmet-async'
import { SEO, CommonOgTags } from '../lib/seo'
import { buildBreadcrumbSchema } from '../lib/structured-data'
import StructuredData from '../components/StructuredData'
import SubscribeForm from '../components/SubscribeForm'
import { BRAND } from '../config'

const META = {
  title: 'Newsletter - Actually Relevant',
  description:
    'Subscribe to the Actually Relevant weekly newsletter. The stories that matter to humanity, curated by AI and delivered to your inbox every week.',
  url: `${SEO.siteUrl}/newsletter`,
}

const breadcrumb = buildBreadcrumbSchema([
  { name: 'Home', url: SEO.siteUrl },
  { name: 'Newsletter', url: META.url },
])

export default function NewsletterPage() {
  return (
    <>
      <Helmet>
        <title>{META.title}</title>
        <meta name="description" content={META.description} />
        <link rel="canonical" href={META.url} />
        <meta property="og:title" content={META.title} />
        <meta property="og:description" content={META.description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={META.url} />
        {CommonOgTags({})}
      </Helmet>
      <StructuredData data={breadcrumb} />

      <div className="page-section py-16">
        <h1 className="page-title">Newsletter</h1>
        <p className="page-intro">
          {BRAND.claim} Weekly to your inbox.
        </p>

        <div className="max-w-md mx-auto mt-8">
          <SubscribeForm hideHeading idPrefix="newsletter-page" />
        </div>
      </div>
    </>
  )
}
