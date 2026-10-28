import { and, eq, gt, inArray } from 'drizzle-orm'

/**
 * DELETE /api/me/products/:id: remove a product. Not allowed while it's in a
 * waiting, scheduled or running promotion (that would cancel a paid placement).
 */
export default defineEventHandler(async (event) => {
  const { vendor } = await requireVendor(event)
  const id = getRouterParam(event, 'id')!
  const db = useDb()
  const { products, promotions: p } = schema
  const [promo] = await db.select({ id: p.id }).from(p)
    .where(and(eq(p.productId, id), inArray(p.status, ['pending', 'approved']), gt(p.endsAt, new Date()))).limit(1)
  if (promo) throw createError({ statusCode: 409, message: 'This product is in a promotion. Mark it sold out instead, or delete it after the promotion ends.' })
  const [row] = await db.delete(products).where(and(eq(products.id, id), eq(products.vendorId, vendor.id))).returning({ id: products.id })
  if (!row) throw createError({ statusCode: 404, message: 'Product not found' })
  setResponseStatus(event, 204)
  return null
})
