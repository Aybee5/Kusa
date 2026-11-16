/**
 * GET /api/vendors/:slugOrId/videos: a shop's videos shoppers can play.
 * Videos not checked for a day are re-checked with their platform after the
 * response is sent.
 */
export default defineEventHandler(async (event) => {
  const v = await findPublicVendor(getRouterParam(event, 'vendor')!)
  if (!v) throw createError({ statusCode: 404, message: 'Business not found' })
  const rows = await listVendorVideos(v.id, true)
  if (rows.length) recheckStaleVideos(v.id).catch((e) => console.warn('[videos] recheck failed', e))
  return rows.map(toVendorVideo)
})
