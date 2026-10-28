import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

const Body = z.union([
  z.object({ action: z.literal('cancel') }),
  z.object({ paymentRef: z.string().trim().min(1).max(80) }),
])

/** PATCH /api/me/promotions/:id: add a payment reference to, or cancel, a request that's still waiting. */
export default defineEventHandler(async (event) => {
  const { vendor } = await requireVendor(event)
  const body = await readValidatedBody(event, Body.parse)
  const { promotions: p } = schema
  const id = getRouterParam(event, 'id')!
  const [row] = await useDb().update(p)
    .set('action' in body ? { status: 'cancelled', decidedAt: new Date() } : { paymentRef: body.paymentRef })
    .where(and(eq(p.id, id), eq(p.vendorId, vendor.id), eq(p.status, 'pending')))
    .returning({ id: p.id })
  if (!row) throw createError({ statusCode: 404, message: 'No waiting request with that id' })
  return (await listPromotions(eq(p.id, id)))[0]
})
