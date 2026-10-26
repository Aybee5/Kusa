import { and, eq } from 'drizzle-orm'
import type { Review } from '#shared/types'

/** GET /api/vendors/:slugOrId/reviews/mine: the signed-in shopper's rating, if any. */
export default defineEventHandler(async (event): Promise<Review | null> => {
  const user = await requireUser(event)
  const v = await findPublicVendor(getRouterParam(event, 'vendor')!)
  if (!v) throw createError({ statusCode: 404, statusMessage: 'Business not found' })
  const [r] = await useDb().select().from(schema.reviews).where(and(eq(schema.reviews.vendorId, v.id), eq(schema.reviews.userId, user.id))).limit(1)
  return r ? toReview(r) : null
})
