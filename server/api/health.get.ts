import { sql } from 'drizzle-orm'

/** GET /api/health: for uptime checks. Also shows which location search is active. */
export default defineEventHandler(async () => {
  await useDb().execute(sql`select 1`)
  return { ok: true, geoSearch: geoMode() }
})
