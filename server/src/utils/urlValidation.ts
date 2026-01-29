const BLOCKED_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
  /\.internal$/i,
  /\.local$/i,
]

export function isAllowedUrl(urlStr: string): boolean {
  let url: URL
  try {
    url = new URL(urlStr)
  } catch {
    return false
  }

  if (!['http:', 'https:'].includes(url.protocol)) return false

  // Strip brackets from IPv6 addresses
  const hostname = url.hostname.replace(/^\[|\]$/g, '')
  return !BLOCKED_HOSTNAME_PATTERNS.some(re => re.test(hostname))
}
