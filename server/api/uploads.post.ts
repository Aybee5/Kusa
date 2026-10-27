import { z } from 'zod'
import type { UploadResult } from '#shared/types/api'

const Body = z.object({
  kind: z.enum(['product', 'verification', 'banner', 'shop']),
  // ~6 MB image as base64
  dataUrl: z.string().max(8_500_000),
})

/**
 * POST /api/uploads: store a photo. Product photos (vendors only) and banner
 * images (vendors and admins) get a public URL; verification photos are
 * private and only reachable by admins through signed links.
 */
export default defineEventHandler(async (event): Promise<UploadResult> => {
  const user = await requireUser(event)
  const { kind, dataUrl } = await readValidatedBody(event, Body.parse)
  if ((kind === 'product' || kind === 'shop') && user.role !== 'vendor') throw createError({ statusCode: 403, message: 'Only vendors can add product and shop photos' })
  if (kind === 'banner' && user.role === 'shopper') throw createError({ statusCode: 403, message: 'Only vendors can add banner images' })
  const key = await storeImage(dataUrl, kind, user.id)
  return { key, url: kind === 'verification' ? null : publicFileUrl(key)! }
})
