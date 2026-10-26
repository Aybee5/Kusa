import { z } from 'zod'
import type { UploadResult } from '#shared/types/api'

const Body = z.object({
  kind: z.enum(['product', 'verification']),
  // ~6 MB image as base64
  dataUrl: z.string().max(8_500_000),
})

/**
 * POST /api/uploads: store a photo. Product photos (vendors only) get a public
 * URL; verification photos are private and only reachable by admins through
 * signed links.
 */
export default defineEventHandler(async (event): Promise<UploadResult> => {
  const user = await requireUser(event)
  const { kind, dataUrl } = await readValidatedBody(event, Body.parse)
  if (kind === 'product' && user.role !== 'vendor') throw createError({ statusCode: 403, message: 'Only vendors can add product photos' })
  const key = await storeImage(dataUrl, kind, user.id)
  return { key, url: kind === 'product' ? publicFileUrl(key)! : null }
})
