import { desc, eq } from 'drizzle-orm'

/** GET /api/admin/vendors/:id/products */
export default defineEventHandler(async (event) => {
  await requireRole(event, 'admin')
  const rows = await useDb().select().from(schema.products)
    .where(eq(schema.products.vendorId, getRouterParam(event, 'id')!)).orderBy(desc(schema.products.createdAt))
  return rows.map(toProduct)
})
