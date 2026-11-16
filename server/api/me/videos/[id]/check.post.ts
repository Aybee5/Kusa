import { eq } from 'drizzle-orm'

/**
 * POST /api/me/videos/:id/check: the vendor fixed a video (made it public
 * again) and wants it checked now. TikTok and Facebook can't be checked from
 * the server, so for those this clears the problem report and shows it again.
 */
export default defineEventHandler(async (event) => {
  const { vendor } = await requireVendor(event)
  const video = await ownVideo(vendor.id, getRouterParam(event, 'id')!)
  const check = await checkVideo(video)
  if (check.state === 'unknown') {
    const [row] = await useDb().update(schema.vendorVideos)
      .set({ status: 'active', problemReportedAt: null, checkedAt: new Date() })
      .where(eq(schema.vendorVideos.id, video.id)).returning()
    return toMyVendorVideo(row!)
  }
  return toMyVendorVideo((await recordCheck(video.id, check))!)
})
