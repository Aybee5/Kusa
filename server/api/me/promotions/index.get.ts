import { eq } from 'drizzle-orm'

/** GET /api/me/promotions: the signed-in vendor's promotions, newest first, with impressions and clicks. */
export default defineEventHandler(async (event) => {
  const { vendor } = await requireVendor(event)
  return listPromotions(eq(schema.promotions.vendorId, vendor.id))
})
