import { randomUUID } from 'node:crypto'
import type { UploadKind } from '#shared/types/api'

const TYPES: Record<string, { ext: string; magic: (b: Buffer) => boolean }> = {
  'image/jpeg': { ext: 'jpg', magic: (b) => b[0] === 0xff && b[1] === 0xd8 },
  'image/png': { ext: 'png', magic: (b) => b.subarray(1, 4).toString() === 'PNG' },
  'image/webp': { ext: 'webp', magic: (b) => b.subarray(8, 12).toString() === 'WEBP' },
}
export const MAX_UPLOAD_BYTES = 6 * 1024 * 1024

export const uploads = () => useStorage('uploads')

/** Decode a data URL, check it really is a JPEG, PNG or WebP image, and store it. */
export async function storeImage(dataUrl: string, kind: UploadKind, userId: string): Promise<string> {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl)
  if (!m) throw createError({ statusCode: 400, message: 'Upload a JPEG, PNG or WebP photo' })
  const type = TYPES[m[1]!]!
  const buf = Buffer.from(m[2]!, 'base64')
  if (buf.length > MAX_UPLOAD_BYTES) throw createError({ statusCode: 413, message: 'That photo is too large (max 6 MB)' })
  if (!type.magic(buf)) throw createError({ statusCode: 400, message: 'That file isn’t a valid image' })
  const key = `${kind}/${userId}/${randomUUID()}.${type.ext}`
  await uploads().setItemRaw(key, buf)
  return key
}

export function contentTypeFor(key: string): string {
  const ext = key.split('.').pop()
  return ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
}

/**
 * Public URL for a stored photo. Keys starting with "/" are photos shipped
 * with the site (the demo data's /images/…), served as they are.
 */
export const publicFileUrl = (key: string | null | undefined) => (!key ? undefined : key.startsWith('/') ? key : `/api/files/${key}`)

/** Verification photos need a signed link that expires. */
export function signedFileUrl(key: string | null | undefined, ttlSeconds = 15 * 60): string | undefined {
  if (!key) return undefined
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds
  return `/api/files/${key}?exp=${exp}&sig=${hmac(`file:${key}:${exp}`)}`
}

export function checkFileSignature(key: string, exp: unknown, sig: unknown): boolean {
  if (typeof exp !== 'string' || typeof sig !== 'string') return false
  if (Number(exp) < Date.now() / 1000) return false
  return safeEqual(sig, hmac(`file:${key}:${exp}`))
}

/** Uploaded keys must belong to the person using them. */
export function assertOwnKey(key: string | undefined, kind: UploadKind, userId: string) {
  if (key && !key.startsWith(`${kind}/${userId}/`)) throw createError({ statusCode: 400, message: 'Invalid photo reference' })
}
