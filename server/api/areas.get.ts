import { eq, sql } from 'drizzle-orm'
import type { Area } from '#shared/types/api'

/**
 * GET /api/areas: states, cities and neighbourhoods that have verified
 * businesses, with a centre point and count, for shoppers who'd rather pick an area than share
 * their location (or want to look somewhere else).
 */
export default defineEventHandler(async (): Promise<Area[]> => {
  const { vendors } = schema
  const rows = await useDb()
    .select({
      state: vendors.state,
      city: sql<string>`min(${vendors.city})`,
      area: sql<string>`min(${vendors.area})`,
      lat: sql<number>`avg(${vendors.lat})::float8`,
      lng: sql<number>`avg(${vendors.lng})::float8`,
      count: sql<number>`count(*)::int`,
    })
    .from(vendors)
    .where(eq(vendors.status, 'verified'))
    .groupBy(vendors.state, sql`lower(trim(${vendors.city})), lower(trim(${vendors.area}))`)
  return rows
    .filter((r) => r.area?.trim())
    .map((r) => ({ state: r.state, city: r.city.trim(), area: r.area.trim(), lat: +r.lat.toFixed(5), lng: +r.lng.toFixed(5), count: r.count }))
    .sort((a, b) => a.state.localeCompare(b.state) || a.city.localeCompare(b.city) || b.count - a.count || a.area.localeCompare(b.area))
})
