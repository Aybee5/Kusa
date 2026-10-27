import { and, desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import type { ProductWithVendor } from '#shared/types/api'

/** GET /api/products/latest?lat&lng&limit&state&city: newest available products from verified businesses. */
export default defineEventHandler(async (event): Promise<ProductWithVendor[]> => {
  const query = getQuery(event)
  const limit = z.coerce.number().int().min(1).max(24).catch(8).parse(query.limit)
  const place = SearchQuery.pick({ state: true, city: true }).catch({ state: undefined, city: undefined }).parse(query)
  const { products, vendors } = schema
  const rows = await useDb()
    .select({ p: products, v: vendors })
    .from(products)
    .innerJoin(vendors, eq(vendors.id, products.vendorId))
    .where(and(eq(vendors.status, 'verified'), eq(products.available, true), ...inPlace(place)))
    .orderBy(desc(products.createdAt))
    .limit(limit)
  const metas = await withMeta([...new Map(rows.map((r) => [r.v.id, r.v])).values()], originFrom(query))
  const byId = new Map(metas.map((m) => [m.id, m]))
  return rows.map((r) => ({ product: toProduct(r.p), vendor: byId.get(r.v.id)! }))
})
