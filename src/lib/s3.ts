import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"

// Configurar cliente S3
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export const S3_CONFIG = {
  bucket: process.env.AWS_S3_BUCKET!,
  region: process.env.AWS_REGION || "us-east-1",
  cloudfrontDomain: process.env.AWS_CLOUDFRONT_DOMAIN, // Opcional
}

/**
 * Sube un archivo a S3
 */
export async function uploadToS3(
  file: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  try {
    const command = new PutObjectCommand({
      Bucket: S3_CONFIG.bucket,
      Key: key,
      Body: file,
      ContentType: contentType,
      CacheControl: "max-age=31536000", // 1 año
    })

    await s3Client.send(command)

    // Retornar URL de CloudFront si está configurado, sino URL de S3
    if (S3_CONFIG.cloudfrontDomain) {
      return `https://${S3_CONFIG.cloudfrontDomain}/${key}`
    } else {
      return `https://${S3_CONFIG.bucket}.s3.${S3_CONFIG.region}.amazonaws.com/${key}`
    }
  } catch (error) {
    console.error("Error subiendo a S3:", error)
    throw new Error("Error al subir archivo a S3")
  }
}

/**
 * Elimina un archivo de S3
 */
export async function deleteFromS3(key: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: S3_CONFIG.bucket,
      Key: key,
    })

    await s3Client.send(command)
  } catch (error) {
    console.error("Error eliminando de S3:", error)
    throw new Error("Error al eliminar archivo de S3")
  }
}

/**
 * Obtiene la URL pública de un archivo
 */
export function getPublicUrl(key: string): string {
  if (S3_CONFIG.cloudfrontDomain) {
    return `https://${S3_CONFIG.cloudfrontDomain}/${key}`
  } else {
    return `https://${S3_CONFIG.bucket}.s3.${S3_CONFIG.region}.amazonaws.com/${key}`
  }
}

/**
 * Extrae la key de una URL de S3 o CloudFront
 */
export function extractKeyFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url)
    // Para CloudFront o S3, la key es el pathname sin el primer /
    return urlObj.pathname.substring(1)
  } catch {
    return null
  }
}
