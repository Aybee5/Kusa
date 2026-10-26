import { z } from 'zod'
import { CATEGORIES } from '#shared/utils/catalog'

const flag = z.preprocess((v) => v === 'true' || v === '1' || v === true, z.boolean())

const Query = z.object({
  q: z.string().max(80).default(''),
  category: z.enum(['', ...CATEGORIES.map((c) => c.id)] as [string, ...string[]]).default(''),
  minRating: z.coerce.number().min(0).max(5).default(0),
  openNow: flag.default(false),
  delivery: flag.default(false),
  pickup: flag.default(false),
  radiusKm: z.coerce.number().min(0).max(100).default(0),
  sort: z.enum(['nearest', 'top-rated']).default('nearest'),
})

/** GET /api/vendors: verified businesses near ?lat&lng, filtered and sorted. */
export default defineEventHandler(async (event) => {
  const f = await getValidatedQuery(event, Query.parse)
  return searchVendors({ ...f, category: f.category as never, verifiedOnly: true }, originFrom(getQuery(event)))
})
