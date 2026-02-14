import { createRestAPIClient } from 'masto'
import type { mastodon } from 'masto'
import { config } from '../config.js'
import { createLogger } from './logger.js'
import { withRetry } from './retry.js'

const log = createLogger('mastodon')

let client: mastodon.rest.Client | null = null

function isConfigured(): boolean {
  return Boolean(config.mastodon.instanceUrl && config.mastodon.accessToken)
}

function getClient(): mastodon.rest.Client {
  if (!isConfigured()) {
    throw new Error('Mastodon credentials not configured. Set MASTODON_URL and MASTODON_TOKEN.')
  }

  if (!client) {
    client = createRestAPIClient({
      url: config.mastodon.instanceUrl,
      accessToken: config.mastodon.accessToken,
    })
    log.info({ instanceUrl: config.mastodon.instanceUrl }, 'Mastodon client initialized')
  }

  return client
}

// ---------------------------------------------------------------------------
// Post creation
// ---------------------------------------------------------------------------

export interface CreateStatusOptions {
  visibility?: 'public' | 'unlisted' | 'private'
  language?: string
  idempotencyKey?: string
}

export interface CreateStatusResult {
  id: string
  url: string
}

/**
 * Create a Mastodon status (post).
 *
 * @param text - Full post text (including URLs — Mastodon auto-generates link previews)
 * @param options - Visibility, language, idempotency key
 */
export async function createStatus(
  text: string,
  options: CreateStatusOptions = {},
): Promise<CreateStatusResult> {
  const { visibility = config.mastodon.visibility, language = 'en' } = options

  return withRetry(
    async () => {
      const c = getClient()

      log.info({ textLength: text.length, visibility }, 'creating Mastodon status')

      const status = await c.v1.statuses.create({
        status: text,
        visibility,
        language,
      })

      log.info({ statusId: status.id, url: status.url }, 'Mastodon status created')

      return { id: status.id, url: status.url ?? '' }
    },
    { retries: 2, baseDelayMs: 2000 },
  )
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

export interface StatusMetrics {
  favouriteCount: number
  boostCount: number
  replyCount: number
}

/**
 * Fetch engagement metrics for a status.
 */
export async function getStatusMetrics(statusId: string): Promise<StatusMetrics> {
  return withRetry(
    async () => {
      const c = getClient()
      const status = await c.v1.statuses.$select(statusId).fetch()

      return {
        favouriteCount: status.favouritesCount,
        boostCount: status.reblogsCount,
        replyCount: status.repliesCount,
      }
    },
    { retries: 2, baseDelayMs: 2000 },
  )
}

// ---------------------------------------------------------------------------
// Deletion
// ---------------------------------------------------------------------------

/**
 * Delete a status from Mastodon.
 */
export async function deleteStatus(statusId: string): Promise<void> {
  return withRetry(
    async () => {
      const c = getClient()
      log.info({ statusId }, 'deleting Mastodon status')
      await c.v1.statuses.$select(statusId).remove()
      log.info({ statusId }, 'Mastodon status deleted')
    },
    { retries: 2, baseDelayMs: 2000 },
  )
}

// ---------------------------------------------------------------------------
// Account statuses (for feed view)
// ---------------------------------------------------------------------------

export interface AccountStatusItem {
  id: string
  url: string
  text: string
  createdAt: string
  favouriteCount: number
  boostCount: number
  replyCount: number
  isReblog: boolean
}

export interface AccountStatusesResult {
  items: AccountStatusItem[]
  /** ID of the last item for pagination (use as max_id for next page). */
  nextMaxId?: string
}

/**
 * Fetch the bot account's statuses from Mastodon.
 */
export async function getAccountStatuses(
  options: { maxId?: string; limit?: number } = {},
): Promise<AccountStatusesResult> {
  const { maxId, limit = 25 } = options

  return withRetry(
    async () => {
      const c = getClient()

      // Verify credentials to get the account ID
      const account = await c.v1.accounts.verifyCredentials()

      log.info({ limit, maxId: maxId ?? null }, 'fetching Mastodon account statuses')

      const params: Record<string, unknown> = {
        limit,
        excludeReplies: true,
      }
      if (maxId) params.maxId = maxId

      const statuses = await c.v1.accounts.$select(account.id).statuses.list(params as any)

      const items: AccountStatusItem[] = statuses.map((s) => ({
        id: s.id,
        url: s.url ?? '',
        text: s.content.replace(/<[^>]*>/g, ''), // Strip HTML tags for plain text
        createdAt: s.createdAt,
        favouriteCount: s.favouritesCount,
        boostCount: s.reblogsCount,
        replyCount: s.repliesCount,
        isReblog: s.reblog !== null,
      }))

      const nextMaxId = items.length > 0 ? items[items.length - 1].id : undefined

      log.info({ itemCount: items.length, nextMaxId: nextMaxId ?? null }, 'fetched Mastodon account statuses')
      return { items, nextMaxId }
    },
    { retries: 2, baseDelayMs: 2000 },
  )
}

/**
 * Check if Mastodon is configured (credentials present).
 */
export { isConfigured as isMastodonConfigured }
