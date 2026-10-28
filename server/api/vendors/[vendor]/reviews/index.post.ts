import { and, eq, gt, sql } from 'drizzle-orm'
import { z } from 'zod'

const Body = z.object({
  stars: z.number().int().min(1).max(5),
  tags: z.array(z.string().trim().min(1).max(30)).max(6).default([]),
  text: z.string().trim().max(600).default(''),
})

/**
 * POST /api/vendors/:slugOrId/reviews: rate a business (one rating per
 * shopper; posting again updates it). New accounts that post several ratings
 * within an hour are flagged for an admin to check.
 */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readValidatedBody(event, Body.parse)
  const v = await findPublicVendor(getRouterParam(event, 'vendor')!)
  if (!v) throw createError({ statusCode: 404, message: 'Business not found' })
  if (v.ownerId === user.id) throw createError({ statusCode: 403, message: 'You can’t rate your own business' })

  const db = useDb()
  const { reviews } = schema
  const [existing] = await db.select().from(reviews).where(and(eq(reviews.vendorId, v.id), eq(reviews.userId, user.id))).limit(1)

  let status: 'published' | 'flagged' | 'hidden' = existing?.status === 'hidden' ? 'hidden' : existing?.status ?? 'published'
  let flagReason = existing?.flagReason ?? null
  const newAccount = Date.now() - user.createdAt.getTime() < 86400000
  if (!existing && newAccount) {
    const [{ recent }] = await db.select({ recent: sql<number>`count(*)::int` }).from(reviews)
      .where(and(eq(reviews.userId, user.id), gt(reviews.createdAt, new Date(Date.now() - 3600_000)))) as [{ recent: number }]
    if (recent >= 3) {
      status = 'flagged'
      flagReason = `Auto-flagged: new account posted ${recent + 1} ratings within an hour.`
    }
  }

  const values = { stars: body.stars, tags: body.tags, text: body.text, status, flagReason, updatedAt: new Date() }
  const [row] = existing
    ? await db.update(reviews).set(values).where(eq(reviews.id, existing.id)).returning()
    : await db.insert(reviews).values({ vendorId: v.id, userId: user.id, ...values }).returning()
  return toReview(row!)
})
