import { DomainLimiter } from './domainLimiter.js'
import { config } from '../config.js'

/** Shared domain limiter for all crawl HTTP requests (RSS fetches + article extraction) */
export const crawlLimiter = new DomainLimiter(
  config.crawl.maxConcurrencyPerDomain,
  config.crawl.minDelayPerDomainMs,
)

crawlLimiter.startCleanup()
