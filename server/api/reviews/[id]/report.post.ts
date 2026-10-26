import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

const Body = z.object({ reason: z.string().trim().min(1).max(300) })

/** POST /api/reviews/:id/report: flag a review for an admin to check. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const { reason } = await readValidatedBody(event, Body.parse)
  const db = useDb()
  const { reviews, vendors } = schema
  const [row] = await db.select({ r: reviews, ownerId: vendors.ownerId }).from(reviews)
    .innerJoin(vendors, eq(vendors.id, reviews.vendorId))
    .where(eq(reviews.id, getRouterParam(event, 'id')!)).limit(1)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Review not found' })
  if (row.r.userId === user.id) throw createError({ statusCode: 400, statusMessage: 'You can edit your own review instead' })
  const who = row.ownerId === user.id ? 'Reported by vendor' : 'Reported by a shopper'
  await db.update(reviews).set({ status: 'flagged', flagReason: `${who}: “${reason}”` })
    .where(and(eq(reviews.id, row.r.id), eq(reviews.status, 'published')))
  setResponseStatus(event, 204)
  return null
})
