/** GET /api/me/videos: the signed-in vendor's shop videos, including unavailable ones. */
export default defineEventHandler(async (event) => {
  const { vendor } = await requireVendor(event)
  return (await listVendorVideos(vendor.id, false)).map(toMyVendorVideo)
})
