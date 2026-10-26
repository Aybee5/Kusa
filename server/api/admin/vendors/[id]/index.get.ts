import { eq } from 'drizzle-orm'

/** GET /api/admin/vendors/:id: one business with short-lived links to its verification photos. */
export default defineEventHandler(async (event) => {
  await requireRole(event, 'admin')
  const [row] = await useDb().select().from(schema.vendors).where(eq(schema.vendors.id, getRouterParam(event, 'id')!)).limit(1)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Business not found' })
  const [vendor] = await toAdminVendors([row], true)
  return vendor
})
