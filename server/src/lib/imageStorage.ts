import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { config } from '../config.js'
import { createLogger } from './logger.js'

const log = createLogger('image-storage')

function getS3Client(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: config.r2.endpoint,
    credentials: {
      accessKeyId: config.r2.accessKeyId,
      secretAccessKey: config.r2.secretAccessKey,
    },
  })
}

/**
 * Sube una imagen (buffer) a Cloudflare R2 y retorna la URL pública.
 */
export async function uploadImageToR2(
  imageBuffer: Buffer,
  filename: string,
  contentType: string = 'image/png',
): Promise<string> {
  const client = getS3Client()

  const key = `social/${filename}`

  log.info({ key, size: imageBuffer.length }, 'uploading image to R2')

  await client.send(
    new PutObjectCommand({
      Bucket: config.r2.bucketName,
      Key: key,
      Body: imageBuffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000', // 1 año
    }),
  )

  const publicUrl = `${config.r2.publicUrl}/${key}`
  log.info({ publicUrl }, 'image uploaded to R2')

  return publicUrl
}
