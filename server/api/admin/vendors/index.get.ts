import { desc } from 'drizzle-orm'

/** GET /api/admin/vendors: every business, newest first. */
export default defineEventHandler(async (event) => {
  await requireRole(event, 'admin')
  const rows = await useDb().select().from(schema.vendors).orderBy(desc(schema.vendors.createdAt)).limit(1000)
  return toAdminVendors(rows)
})
