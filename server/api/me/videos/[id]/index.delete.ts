import { eq } from 'drizzle-orm'

/** DELETE /api/me/videos/:id: remove a video from the shop. */
export default defineEventHandler(async (event) => {
  const { vendor } = await requireVendor(event)
  const video = await ownVideo(vendor.id, getRouterParam(event, 'id')!)
  await useDb().delete(schema.vendorVideos).where(eq(schema.vendorVideos.id, video.id))
  setResponseStatus(event, 204)
  return null
})
