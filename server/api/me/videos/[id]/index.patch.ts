import { eq } from 'drizzle-orm'
import { z } from 'zod'

const Body = z.object({
  title: z.string().trim().max(80).optional(),
  coverImageKey: z.string().max(200).nullable().optional(),
})

/** PATCH /api/me/videos/:id: change a video's title or cover photo (null removes it). */
export default defineEventHandler(async (event) => {
  const { user, vendor } = await requireVendor(event)
  const video = await ownVideo(vendor.id, getRouterParam(event, 'id')!)
  const body = await readValidatedBody(event, Body.parse)
  if (body.coverImageKey) assertOwnKey(body.coverImageKey, 'shop', user.id)
  const changes = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined))
  if (!Object.keys(changes).length) return toMyVendorVideo(video)
  const [row] = await useDb().update(schema.vendorVideos).set(changes).where(eq(schema.vendorVideos.id, video.id)).returning()
  return toMyVendorVideo(row!)
})
