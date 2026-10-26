import { eq, sql } from 'drizzle-orm'
import type { Area } from '#shared/types/api'

/**
 * GET /api/areas: neighbourhoods and cities that have verified businesses,
 * with a centre point, for shoppers who'd rather pick an area than share
 * their location (or want to look somewhere else).
 */
export default defineEventHandler(async (): Promise<Area[]> => {
  const { vendors } = schema
  const rows = await useDb()
    .select({
      city: sql<string>`min(${vendors.city})`,
      area: sql<string>`min(${vendors.area})`,
      lat: sql<number>`avg(${vendors.lat})::float8`,
      lng: sql<number>`avg(${vendors.lng})::float8`,
      count: sql<number>`count(*)::int`,
    })
    .from(vendors)
    .where(eq(vendors.status, 'verified'))
    .groupBy(sql`lower(trim(${vendors.city})), lower(trim(${vendors.area}))`)
  return rows
    .filter((r) => r.area?.trim())
    .map((r) => ({ city: r.city.trim(), area: r.area.trim(), lat: +r.lat.toFixed(5), lng: +r.lng.toFixed(5), count: r.count }))
    .sort((a, b) => a.city.localeCompare(b.city) || b.count - a.count || a.area.localeCompare(b.area))
})
