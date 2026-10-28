import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { promotionState } from '#shared/utils/promotions'

const Body = z.object({
  action: z.enum(['approve', 'reject', 'end']),
  note: z.string().trim().max(300).optional(),
})

/**
 * PATCH /api/admin/promotions/:id
 * - approve: payment confirmed; the promotion runs from its start date (or now, if that's passed) for its duration
 * - reject: with a note the vendor sees
 * - end: stop a running or scheduled promotion now
 */
export default defineEventHandler(async (event) => {
  await requireRole(event, 'admin')
  const { action, note } = await readValidatedBody(event, Body.parse)
  const db = useDb()
  const { promotions: p } = schema
  const id = getRouterParam(event, 'id')!
  const [row] = await db.select().from(p).where(eq(p.id, id)).limit(1)
  if (!row) throw createError({ statusCode: 404, message: 'Promotion not found' })
  const state = promotionState(row)
  const now = new Date()

  if (action === 'approve' || action === 'reject') {
    if (state !== 'pending') throw createError({ statusCode: 409, message: 'This request has already been handled' })
    if (action === 'reject' && !note) throw createError({ statusCode: 400, message: 'Tell the vendor why it was rejected' })
    if (action === 'approve' && row.vendorId) {
      const [v] = await db.select({ status: schema.vendors.status }).from(schema.vendors).where(eq(schema.vendors.id, row.vendorId)).limit(1)
      if (v?.status !== 'verified') throw createError({ statusCode: 409, message: 'This business isn’t verified any more' })
    }
    await db.update(p).set(action === 'approve'
      ? { status: 'approved', ...scheduleFrom(row.startsAt, row.durationDays, now), adminNote: note || null, decidedAt: now }
      : { status: 'rejected', adminNote: note!, decidedAt: now },
    ).where(eq(p.id, id))
    // A real deployment would text the vendor here (approved with dates, or rejected with the note).
  } else {
    if (state !== 'running' && state !== 'scheduled') throw createError({ statusCode: 409, message: 'Only running or scheduled promotions can be ended' })
    await db.update(p).set({ endsAt: now, ...(state === 'scheduled' ? { startsAt: now } : {}), adminNote: note || row.adminNote }).where(eq(p.id, id))
  }
  return (await listPromotions(eq(p.id, id)))[0]
})
