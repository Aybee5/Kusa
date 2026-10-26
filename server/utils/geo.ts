import { sql, type SQL } from 'drizzle-orm'
import type { Pool } from 'pg'
import type { LatLng } from '#shared/types/api'

/**
 * How "near me" searches run.
 *
 * - basic   (default): latitude/longitude columns with an indexed bounding box,
 *           then exact distance in the app. Works on any Postgres.
 * - postgis: a geography column with a GiST index; the database filters by
 *           radius (ST_DWithin) and sorts nearest first (KNN). Faster once
 *           there are tens of thousands of businesses.
 *
 * Choose with GEO_SEARCH=basic|postgis. With postgis, start-up enables the
 * extension and adds the column and index if they're missing; if that fails
 * (e.g. the host doesn't offer PostGIS) the server logs why and stays on basic.
 * Switching back to basic needs no database changes.
 */
export type GeoMode = 'basic' | 'postgis'

let active: GeoMode = 'basic'
export const geoMode = () => active

export async function setupGeo(pool: Pool, requested: GeoMode, log = console.log): Promise<GeoMode> {
  if (requested !== 'postgis') {
    active = 'basic'
    return active
  }
  try {
    await pool.query('CREATE EXTENSION IF NOT EXISTS postgis')
    await pool.query(`
      ALTER TABLE vendors ADD COLUMN IF NOT EXISTS geog geography(Point, 4326)
        GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) STORED`)
    await pool.query('CREATE INDEX IF NOT EXISTS vendors_geog_idx ON vendors USING gist (geog)')
    active = 'postgis'
    log('[geo] PostGIS search enabled')
  } catch (e) {
    active = 'basic'
    console.warn(`[geo] GEO_SEARCH=postgis but PostGIS couldn't be enabled (${(e as Error).message}). Using basic search.`)
  }
  return active
}

const point = (o: LatLng) => sql`ST_SetSRID(ST_MakePoint(${o.lng}, ${o.lat}), 4326)::geography`

/** WHERE clause: within `radiusKm` of `origin`. */
export function withinRadius(origin: LatLng, radiusKm: number): SQL[] {
  if (active === 'postgis') return [sql`ST_DWithin(geog, ${point(origin)}, ${radiusKm * 1000})`]
  const dLat = radiusKm / 111
  const dLng = radiusKm / (111 * Math.cos((origin.lat * Math.PI) / 180))
  return [
    sql`lat between ${origin.lat - dLat} and ${origin.lat + dLat}`,
    sql`lng between ${origin.lng - dLng} and ${origin.lng + dLng}`,
  ]
}

/**
 * ORDER BY nearest first, so the row limit keeps the closest businesses.
 * PostGIS uses the spatial index (KNN). Basic mode sorts by a flat-earth
 * approximation, which ranks identically to true distance at city scale.
 */
export function nearestFirst(origin: LatLng): SQL {
  if (active === 'postgis') return sql`geog <-> ${point(origin)}`
  const k = Math.cos((origin.lat * Math.PI) / 180)
  return sql`(lat - ${origin.lat}) ^ 2 + ((lng - ${origin.lng}) * ${k}) ^ 2`
}
