import { z } from 'zod'
import type { SearchFilters } from '#shared/types'
import { CATEGORIES } from '#shared/utils/catalog'

const flag = z.preprocess((v) => v === 'true' || v === '1' || v === true, z.boolean())

/** Query string for searches: GET /api/vendors and GET /api/promoted. */
export const SearchQuery = z.object({
  q: z.string().max(80).default(''),
  category: z.enum(['', ...CATEGORIES.map((c) => c.id)] as [string, ...string[]]).default(''),
  minRating: z.coerce.number().min(0).max(5).default(0),
  openNow: flag.default(false),
  delivery: flag.default(false),
  pickup: flag.default(false),
  radiusKm: z.coerce.number().min(0).max(100).default(0),
  sort: z.enum(['nearest', 'top-rated']).default('nearest'),
})

export const toFilters = (f: z.infer<typeof SearchQuery>): SearchFilters => ({ ...f, category: f.category as SearchFilters['category'], verifiedOnly: true })
