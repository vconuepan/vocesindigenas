const TRACKING_PARAMS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'fbclid', 'gclid', 'ref', 'source',
]

export function normalizeUrl(url: string): string {
  const parsed = new URL(url)

  // Force HTTPS
  parsed.protocol = 'https:'

  // Remove default port
  parsed.port = ''

  // Remove trailing slash from path (except root "/")
  if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
    parsed.pathname = parsed.pathname.slice(0, -1)
  }

  // Remove tracking parameters
  for (const param of TRACKING_PARAMS) {
    parsed.searchParams.delete(param)
  }

  // Sort remaining query parameters for consistency
  parsed.searchParams.sort()

  // Remove fragment
  parsed.hash = ''

  return parsed.toString()
}
