import { createLogger } from '../lib/logger.js'
import { scrapeDOCIP } from '../services/docipScraper.js'

const log = createLogger('scrape_docip')

export async function runScrapeDOCIP(): Promise<void> {
  log.info('starting DOCIP scrape job')
  await scrapeDOCIP()
  log.info('DOCIP scrape job complete')
}
