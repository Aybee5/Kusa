import { eq } from 'drizzle-orm'
import { z } from 'zod'

const Body = z.object({ status: z.enum(['published', 'flagged', 'hidden']) })

/** PATCH /api/admin/reviews/:id: keep, hide or restore a review. */
export default defineEventHandler(async (event) => {
  const admin = await requireRole(event, 'admin')
  const { status } = await readValidatedBody(event, Body.parse)
  const [row] = await useDb().update(schema.reviews).set({
    status,
    ...(status === 'hidden' ? { flagReason: `Hidden by admin (${admin.name || 'admin'})` } : {}),
    ...(status === 'published' ? { flagReason: null } : {}),
  }).where(eq(schema.reviews.id, getRouterParam(event, 'id')!)).returning()
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Review not found' })
  return toReview(row)
})
