import { z } from 'zod'
import type { SearchFilters } from '#shared/types'
import { CATEGORIES, canonicalCategory } from '#shared/utils/catalog'
import { findState } from '#shared/utils/states'

const flag = z.preprocess((v) => v === 'true' || v === '1' || v === true, z.boolean())

/** Query string for searches: GET /api/vendors and GET /api/promoted. */
export const SearchQuery = z.object({
  q: z.string().max(80).default(''),
  category: z.preprocess((v) => (typeof v === 'string' ? canonicalCategory(v) : v), z.enum(['', ...CATEGORIES.map((c) => c.id)] as [string, ...string[]])).default(''),
  minRating: z.coerce.number().min(0).max(5).default(0),
  openNow: flag.default(false),
  delivery: flag.default(false),
  pickup: flag.default(false),
  radiusKm: z.coerce.number().min(0).max(100).default(0),
  sort: z.enum(['nearest', 'top-rated']).default('nearest'),
  /** Browse a place: a state ("Lagos", "FCT"/"Abuja") and optionally a city in it. */
  state: z.string().max(40).optional().transform((s, ctx) => {
    if (!s) return undefined
    const found = findState(s)
    if (!found) ctx.addIssue({ code: 'custom', message: 'Unknown state' })
    return found ?? undefined
  }),
  city: z.string().trim().max(60).optional().transform((c) => c || undefined),
})

/** A category id, accepting old ids that were merged (e.g. "snacks"). */
export const CategoryField = z.preprocess((v) => (typeof v === 'string' ? canonicalCategory(v) : v), z.enum(CATEGORIES.map((c) => c.id) as [string, ...string[]]))

export const toFilters = (f: z.infer<typeof SearchQuery>): SearchFilters => ({ ...f, category: f.category as SearchFilters['category'], verifiedOnly: true })
