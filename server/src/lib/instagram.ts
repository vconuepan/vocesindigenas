import { config } from '../config.js'
import { createLogger } from './logger.js'
import { withRetry } from './retry.js'

const log = createLogger('instagram')

function isConfigured(): boolean {
  return Boolean(
    config.instagram.accessToken &&
    config.instagram.userId
  )
}

export interface CreatePostResult {
  id: string
  permalink?: string
}

/**
 * Publica una imagen en Instagram usando la API de Graph de Meta.
 * Paso 1: Crear contenedor de media
 * Paso 2: Publicar el contenedor
 */
export async function createPost(
  imageUrl: string,
  caption: string,
): Promise<CreatePostResult> {
  if (!isConfigured()) {
    throw new Error('Instagram credentials not configured.')
  }

  return withRetry(
    async () => {
      const { accessToken, userId } = config.instagram

      log.info({ captionLength: caption.length, imageUrl }, 'creating Instagram post')

      // Paso 1: Crear contenedor de media
      const containerUrl = `https://graph.instagram.com/v21.0/${userId}/media`
      const containerParams = new URLSearchParams({
        image_url: imageUrl,
        caption,
        access_token: accessToken,
      })

      const containerRes = await fetch(`${containerUrl}?${containerParams}`, {
        method: 'POST',
      })

      const containerData = await containerRes.json() as any

      if (!containerRes.ok || containerData.error) {
        throw new Error(`Failed to create media container: ${JSON.stringify(containerData.error || containerData)}`)
      }

      const containerId = containerData.id
      log.info({ containerId }, 'media container created')

      // Esperar 2 segundos antes de publicar (recomendado por Meta)
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Paso 2: Publicar el contenedor
      const publishUrl = `https://graph.instagram.com/v21.0/${userId}/media_publish`
      const publishParams = new URLSearchParams({
        creation_id: containerId,
        access_token: accessToken,
      })

      const publishRes = await fetch(`${publishUrl}?${publishParams}`, {
        method: 'POST',
      })

      const publishData = await publishRes.json() as any

      if (!publishRes.ok || publishData.error) {
        throw new Error(`Failed to publish media: ${JSON.stringify(publishData.error || publishData)}`)
      }

      const postId = publishData.id
      const permalink = `https://www.instagram.com/p/${postId}/`

      log.info({ postId, permalink }, 'Instagram post published')
      return { id: postId, permalink }
    },
    { retries: 2, baseDelayMs: 3000 },
  )
}

export { isConfigured as isInstagramConfigured }
