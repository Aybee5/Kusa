import { and, desc, eq, ne } from 'drizzle-orm'
import type { PublicReview } from '#shared/types/api'

/** GET /api/vendors/:slugOrId/reviews: published reviews, written ones first. */
export default defineEventHandler(async (event): Promise<PublicReview[]> => {
  const v = await findPublicVendor(getRouterParam(event, 'vendor')!)
  if (!v) throw createError({ statusCode: 404, statusMessage: 'Business not found' })
  const { reviews, users } = schema
  const rows = await useDb()
    .select({ r: reviews, name: users.name, tint: users.tint })
    .from(reviews)
    .innerJoin(users, eq(users.id, reviews.userId))
    .where(and(eq(reviews.vendorId, v.id), eq(reviews.status, 'published'), ne(users.status, 'suspended'), ne(reviews.text, '')))
    .orderBy(desc(reviews.updatedAt))
    .limit(50)
  return rows.map(({ r, name, tint }) => {
    const parts = name.trim().split(/\s+/)
    return {
      id: r.id, vendorId: r.vendorId, shopperId: r.userId, stars: r.stars, tags: r.tags, text: r.text,
      createdAt: r.updatedAt.toISOString().slice(0, 10), status: r.status,
      authorName: parts.length > 1 ? `${parts[0]} ${parts[1]![0]}.` : parts[0] || 'Shopper',
      authorInitials: initialsOf(name || 'Shopper'),
      authorTint: tint,
    }
  })
})
