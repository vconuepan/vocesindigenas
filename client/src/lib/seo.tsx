import { ReactNode } from 'react'
import { BRAND } from '../config'

// Shared SEO constants
export const SEO = {
  siteName: 'Actually Relevant',
  siteUrl: 'https://actuallyrelevant.news',
  defaultTitle: 'Actually Relevant - News That Matters to Humanity',
  defaultDescription: `${BRAND.claim} ${BRAND.claimSupport}`,
  ogImage: 'https://actuallyrelevant.news/images/og-image.png',
  ogImageWidth: '1200',
  ogImageHeight: '630',
  twitterCard: 'summary_large_image' as const,
}

/**
 * Common OG meta tags that should appear on every page.
 * Use inside <Helmet> after page-specific tags.
 */
export function CommonOgTags({ image = SEO.ogImage }: { image?: string }): ReactNode {
  return (
    <>
      <meta property="og:site_name" content={SEO.siteName} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content={SEO.ogImageWidth} />
      <meta property="og:image:height" content={SEO.ogImageHeight} />
      <meta name="twitter:card" content={SEO.twitterCard} />
      <meta name="twitter:image" content={image} />
    </>
  )
}
