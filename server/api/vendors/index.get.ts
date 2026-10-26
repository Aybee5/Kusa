/** GET /api/vendors: verified businesses near ?lat&lng, filtered and sorted. */
export default defineEventHandler(async (event) => {
  const f = await getValidatedQuery(event, SearchQuery.parse)
  return searchVendors(toFilters(f), originFrom(getQuery(event)))
})
