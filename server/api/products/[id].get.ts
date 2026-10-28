import { and, eq } from 'drizzle-orm'
import type { ProductWithVendor } from '#shared/types/api'

/** GET /api/products/:id?lat&lng */
export default defineEventHandler(async (event): Promise<ProductWithVendor> => {
  const { products, vendors } = schema
  const [row] = await useDb()
    .select({ p: products, v: vendors })
    .from(products)
    .innerJoin(vendors, eq(vendors.id, products.vendorId))
    .where(and(eq(products.id, getRouterParam(event, 'id')!), eq(vendors.status, 'verified')))
    .limit(1)
  if (!row) throw createError({ statusCode: 404, message: 'Product not found' })
  const [vendor] = await withMeta([row.v], originFrom(getQuery(event)))
  return { product: toProduct(row.p), vendor: vendor! }
})
