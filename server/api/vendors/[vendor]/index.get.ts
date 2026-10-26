/** GET /api/vendors/:slugOrId: one verified business with rating and distance. */
export default defineEventHandler(async (event) => {
  const v = await findPublicVendor(getRouterParam(event, 'vendor')!)
  if (!v) throw createError({ statusCode: 404, statusMessage: 'Business not found' })
  const [withM] = await withMeta([v], originFrom(getQuery(event)))
  return withM
})
