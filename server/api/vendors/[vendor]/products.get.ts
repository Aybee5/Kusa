import { desc, eq } from 'drizzle-orm'

/** GET /api/vendors/:slugOrId/products */
export default defineEventHandler(async (event) => {
  const v = await findPublicVendor(getRouterParam(event, 'vendor')!)
  if (!v) throw createError({ statusCode: 404, statusMessage: 'Business not found' })
  const rows = await useDb().select().from(schema.products).where(eq(schema.products.vendorId, v.id)).orderBy(desc(schema.products.available), schema.products.createdAt)
  return rows.map(toProduct)
})
