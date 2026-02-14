import { config } from '../config.js'
import { createLogger } from '../lib/logger.js'
import { isBlueskyConfigured } from '../lib/bluesky.js'
import { isMastodonConfigured } from '../lib/mastodon.js'
import { findAutoPostCandidates, pickBestStoryForSocial } from '../services/socialMedia.js'
import {
  generateDraft as generateBlueskyDraft,
  publishPost as publishBlueskyPost,
} from '../services/bluesky.js'
import {
  generateDraft as generateMastodonDraft,
  publishPost as publishMastodonPost,
} from '../services/mastodon.js'
import prisma from '../lib/prisma.js'

const log = createLogger('social_auto_post')

interface ChannelConfig {
  name: string
  enabled: boolean
  configured: boolean
  /** Check if this story already has a post on this channel. */
  hasPost: (storyId: string) => Promise<boolean>
  generateDraft: (storyId: string) => Promise<{ id: string }>
  publishPost: (postId: string) => Promise<unknown>
}

function getEnabledChannels(): ChannelConfig[] {
  const channels: ChannelConfig[] = []

  if (config.bluesky.autoPost.enabled && isBlueskyConfigured()) {
    channels.push({
      name: 'bluesky',
      enabled: true,
      configured: true,
      hasPost: async (storyId) => {
        const existing = await prisma.blueskyPost.findFirst({
          where: { storyId, status: 'published' },
        })
        return existing !== null
      },
      generateDraft: async (storyId) => generateBlueskyDraft(storyId),
      publishPost: async (postId) => publishBlueskyPost(postId),
    })
  }

  if (config.mastodon.autoPost.enabled && isMastodonConfigured()) {
    channels.push({
      name: 'mastodon',
      enabled: true,
      configured: true,
      hasPost: async (storyId) => {
        const existing = await prisma.mastodonPost.findFirst({
          where: { storyId, status: 'published' },
        })
        return existing !== null
      },
      generateDraft: async (storyId) => generateMastodonDraft(storyId),
      publishPost: async (postId) => publishMastodonPost(postId),
    })
  }

  return channels
}

export async function runSocialAutoPost(): Promise<void> {
  log.info('starting social auto-post job')

  const channels = getEnabledChannels()
  if (channels.length === 0) {
    log.info('no social media channels enabled for auto-posting')
    return
  }

  log.info({ channels: channels.map((c) => c.name) }, 'enabled channels')

  // Find candidates across all channels
  const lookbackHours = config.socialAutoPost.lookbackHours
  const candidates = await findAutoPostCandidates(lookbackHours)

  if (candidates.length === 0) {
    log.info('no candidate stories found for social posting')
    return
  }

  log.info({ candidateCount: candidates.length }, 'found candidate stories')

  // Pick best story (one LLM call for all channels)
  const { storyId, reasoning } = await pickBestStoryForSocial(candidates)
  log.info({ storyId, reasoning }, 'best story selected for social media')

  // Post to each enabled channel that hasn't posted this story yet
  for (const channel of channels) {
    try {
      const alreadyPosted = await channel.hasPost(storyId)
      if (alreadyPosted) {
        log.info({ channel: channel.name, storyId }, 'story already posted to channel, skipping')
        continue
      }

      log.info({ channel: channel.name, storyId }, 'generating draft')
      const draft = await channel.generateDraft(storyId)

      log.info({ channel: channel.name, postId: draft.id }, 'publishing')
      await channel.publishPost(draft.id)

      log.info({ channel: channel.name, storyId }, 'auto-post published successfully')

      // Brief delay between channel publishes to be polite to APIs
      const delayMs = 2000
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    } catch (err) {
      log.error({ err, channel: channel.name, storyId }, 'auto-post failed for channel')
      // Continue to next channel — don't let one failure block the others
    }
  }

  log.info('social auto-post job complete')
}
