import { z } from 'zod'

const Placement = z.object({ placement: z.enum(['home', 'search']).default('home') })

/**
 * GET /api/promoted?placement=home|search&lat&lng&…search filters: the
 * sponsored businesses, banners and products to show, targeted to the city
 * being browsed and the category, in a fresh random order each time.
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { placement } = Placement.parse(query)
  const f = await getValidatedQuery(event, SearchQuery.parse)
  return promotedFor(placement, toFilters(f), originFrom(query))
})
