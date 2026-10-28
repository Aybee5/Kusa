import { accountLabel } from '#shared/utils/catalog'
import { desc, eq, inArray, sql } from 'drizzle-orm'
import type { AdminReview } from '#shared/types/api'

/** GET /api/admin/reviews: written, flagged and hidden reviews, newest first. Star-only ratings are left out. */
export default defineEventHandler(async (event): Promise<AdminReview[]> => {
  await requireRole(event, 'admin')
  const db = useDb()
  const { reviews, users, vendors } = schema
  const rows = await db
    .select({ r: reviews, author: users, vendorName: vendors.name })
    .from(reviews)
    .innerJoin(users, eq(users.id, reviews.userId))
    .innerJoin(vendors, eq(vendors.id, reviews.vendorId))
    .where(sql`${reviews.text} <> '' or ${reviews.status} <> 'published'`)
    .orderBy(desc(reviews.updatedAt))
    .limit(500)
  const authorIds = [...new Set(rows.map((r) => r.author.id))]
  const counts = authorIds.length
    ? await db.select({ userId: reviews.userId, n: sql<number>`count(*)::int` }).from(reviews).where(inArray(reviews.userId, authorIds)).groupBy(reviews.userId)
    : []
  const countOf = new Map(counts.map((c) => [c.userId, c.n]))
  return rows.map(({ r, author, vendorName }) => ({
    ...toReview(r),
    authorName: author.name || accountLabel(author),
    vendorName,
    authorReviewCount: countOf.get(author.id) ?? 1,
    authorJoinedAt: author.createdAt.toISOString().slice(0, 10),
    authorStatus: author.status,
  }))
})
