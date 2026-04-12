import { config } from '../config.js'
import { createLogger } from './logger.js'

const log = createLogger('linkedin')

export function isLinkedInConfigured(): boolean {
  return !!(config.linkedin.accessToken && config.linkedin.authorUrn)
}

export async function createUgcPost(
  text: string,
  articleUrl: string,
  articleTitle: string,
  articleDescription: string,
): Promise<{ id: string; permalink: string }> {
  const body = {
    author: config.linkedin.authorUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text },
        shareMediaCategory: 'ARTICLE',
        media: [
          {
            status: 'READY',
            description: { text: articleDescription },
            originalUrl: articleUrl,
            title: { text: articleTitle },
          },
        ],
      },
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
    },
  }

  const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.linkedin.accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errorText = await res.text()
    log.error({ status: res.status, body: errorText }, 'LinkedIn API error')
    throw new Error(`LinkedIn API error ${res.status}: ${errorText}`)
  }

  const data = (await res.json()) as { id: string }
  const permalink = `https://www.linkedin.com/feed/update/${data.id}/`
  return { id: data.id, permalink }
}
