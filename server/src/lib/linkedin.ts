import { config } from '../config.js'
import { createLogger } from './logger.js'

const log = createLogger('linkedin')

export function isLinkedInConfigured(): boolean {
  return !!(config.linkedin.accessToken && config.linkedin.authorUrn)
}

// ---------------------------------------------------------------------------
// Image upload — uploads an external image to LinkedIn so it appears reliably
// in posts without depending on LinkedIn's OG scraping.
// ---------------------------------------------------------------------------

async function uploadImageAsset(imageUrl: string): Promise<string | null> {
  try {
    // 1. Download the image from the source URL
    const imgRes = await fetch(imageUrl, {
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ImpactoIndigena/1.0)' },
    })
    if (!imgRes.ok) {
      log.warn({ imageUrl, status: imgRes.status }, 'could not download image for LinkedIn upload')
      return null
    }
    const buffer = Buffer.from(await imgRes.arrayBuffer())
    const contentType = imgRes.headers.get('content-type') || 'image/jpeg'

    // 2. Register the upload with LinkedIn
    const regRes = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.linkedin.accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({
        registerUploadRequest: {
          recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
          owner: config.linkedin.authorUrn,
          serviceRelationships: [
            { relationshipType: 'OWNER', identifier: 'urn:li:userGeneratedContent' },
          ],
        },
      }),
    })
    if (!regRes.ok) {
      const errText = await regRes.text()
      log.warn({ status: regRes.status, body: errText }, 'LinkedIn registerUpload failed')
      return null
    }
    const regData = (await regRes.json()) as {
      value: {
        uploadMechanism: {
          'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest': { uploadUrl: string }
        }
        asset: string
      }
    }
    const uploadUrl =
      regData.value.uploadMechanism[
        'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
      ].uploadUrl
    const assetUrn = regData.value.asset

    // 3. Upload the image binary
    const upRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${config.linkedin.accessToken}`,
        'Content-Type': contentType,
      },
      body: buffer,
    })
    // LinkedIn returns 201 Created on success (not 200)
    if (!upRes.ok && upRes.status !== 201) {
      log.warn({ status: upRes.status }, 'LinkedIn image upload PUT failed')
      return null
    }

    log.info({ assetUrn }, 'image uploaded to LinkedIn')
    return assetUrn
  } catch (err) {
    log.warn({ err }, 'LinkedIn image upload error — will fall back to ARTICLE mode')
    return null
  }
}

// ---------------------------------------------------------------------------
// UGC post creation
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Post metrics — organization pages only
// ---------------------------------------------------------------------------

export interface PostMetrics {
  likeCount: number
  commentCount: number
  impressionCount: number
}

/**
 * Fetch engagement metrics for a published LinkedIn post.
 * Only works when authorUrn is an organization (urn:li:organization:...).
 * For personal profiles LinkedIn does not expose post stats via the API.
 */
export async function getOrgPostMetrics(
  postUrn: string,
  authorUrn: string,
): Promise<PostMetrics | null> {
  // Only attempt for organization URNs
  if (!authorUrn.includes('organization')) {
    log.debug({ authorUrn }, 'LinkedIn metrics only available for organization accounts, skipping')
    return null
  }

  try {
    const encodedOrg = encodeURIComponent(authorUrn)
    // Use shares[0]= for urn:li:share:... and ugcPosts[0]= for urn:li:ugcPost:...
    const postParam = postUrn.startsWith('urn:li:share:')
      ? `shares[0]=${encodeURIComponent(postUrn)}`
      : `ugcPosts[0]=${encodeURIComponent(postUrn)}`
    const url =
      `https://api.linkedin.com/v2/organizationalEntityShareStatistics` +
      `?q=organizationalEntity&organizationalEntity=${encodedOrg}&${postParam}`

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${config.linkedin.accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
      },
    })

    if (!res.ok) {
      const text = await res.text()
      log.warn({ status: res.status, body: text, postUrn }, 'LinkedIn metrics fetch failed')
      return null
    }

    const data = (await res.json()) as {
      elements?: Array<{
        totalShareStatistics?: {
          likeCount?: number
          commentCount?: number
          impressionCount?: number
        }
      }>
    }

    const stats = data.elements?.[0]?.totalShareStatistics
    if (!stats) return null

    return {
      likeCount: stats.likeCount ?? 0,
      commentCount: stats.commentCount ?? 0,
      impressionCount: stats.impressionCount ?? 0,
    }
  } catch (err) {
    log.warn({ err, postUrn }, 'LinkedIn metrics fetch error')
    return null
  }
}

export async function createUgcPost(
  text: string,
  articleUrl: string,
  articleTitle: string,
  articleDescription: string,
  imageUrl?: string | null,
): Promise<{ id: string; permalink: string }> {
  // Try to upload image directly so LinkedIn doesn't need to scrape OG tags.
  let assetUrn: string | null = null
  if (imageUrl) {
    assetUrn = await uploadImageAsset(imageUrl)
  }

  let shareContent: object

  if (assetUrn) {
    // IMAGE mode: image uploaded directly — always shows. Append article URL
    // to post text so readers can click through to the story.
    const finalText = text.includes(articleUrl)
      ? text
      : `${text}\n\n${articleUrl}`

    shareContent = {
      shareCommentary: { text: finalText },
      shareMediaCategory: 'IMAGE',
      media: [
        {
          status: 'READY',
          media: assetUrn,
          title: { text: articleTitle },
        },
      ],
    }
  } else {
    // ARTICLE mode: fallback — LinkedIn scrapes originalUrl for thumbnail.
    shareContent = {
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
    }
  }

  const body = {
    author: config.linkedin.authorUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': shareContent,
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
