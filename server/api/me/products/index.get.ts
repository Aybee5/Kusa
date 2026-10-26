import { desc, eq } from 'drizzle-orm'

/** GET /api/me/products: the vendor's own products, newest first. */
export default defineEventHandler(async (event) => {
  const { vendor } = await requireVendor(event)
  const rows = await useDb().select().from(schema.products).where(eq(schema.products.vendorId, vendor.id)).orderBy(desc(schema.products.createdAt))
  return rows.map(toProduct)
})
