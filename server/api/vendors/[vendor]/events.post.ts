import { sql } from 'drizzle-orm'
import { z } from 'zod'
import { todayLagos } from '#shared/utils/catalog'

const Body = z.object({
  event: z.enum(['view', 'whatsapp', 'instagram', 'call', 'directions']),
  firstVisitToday: z.boolean().optional(),
  productId: z.string().max(64).optional(),
  source: z.enum(['search', 'map', 'share', 'external', 'direct', 'ad']).optional(),
})

/**
 * POST /api/vendors/:slugOrId/events: counts a profile view, a unique visitor
 * (first view from a device that day), or a WhatsApp / Instagram / call / directions tap.
 */
export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, Body.parse)
  const v = await findPublicVendor(getRouterParam(event, 'vendor')!)
  if (!v) throw createError({ statusCode: 404, message: 'Business not found' })
  const db = useDb()
  const day = todayLagos()
  const { vendorDailyStats: s, vendorSourceStats: src, productDailyViews: pv, products } = schema

  const inc = {
    views: body.event === 'view' ? 1 : 0,
    visitors: body.event === 'view' && body.firstVisitToday ? 1 : 0,
    whatsapp: body.event === 'whatsapp' ? 1 : 0,
    instagram: body.event === 'instagram' ? 1 : 0,
    calls: body.event === 'call' ? 1 : 0,
    directions: body.event === 'directions' ? 1 : 0,
  }
  await db.insert(s).values({ vendorId: v.id, day, ...inc }).onConflictDoUpdate({
    target: [s.vendorId, s.day],
    set: {
      views: sql`${s.views} + ${inc.views}`,
      visitors: sql`${s.visitors} + ${inc.visitors}`,
      whatsapp: sql`${s.whatsapp} + ${inc.whatsapp}`,
      instagram: sql`${s.instagram} + ${inc.instagram}`,
      calls: sql`${s.calls} + ${inc.calls}`,
      directions: sql`${s.directions} + ${inc.directions}`,
    },
  })

  if (body.event === 'view') {
    const source = body.source ?? 'direct'
    await db.insert(src).values({ vendorId: v.id, day, source, views: 1 })
      .onConflictDoUpdate({ target: [src.vendorId, src.day, src.source], set: { views: sql`${src.views} + 1` } })
    if (body.productId) {
      const owns = await db.select({ id: products.id }).from(products).where(sql`${products.id} = ${body.productId} and ${products.vendorId} = ${v.id}`).limit(1)
      if (owns.length) {
        await db.insert(pv).values({ productId: body.productId, day, views: 1 })
          .onConflictDoUpdate({ target: [pv.productId, pv.day], set: { views: sql`${pv.views} + 1` } })
      }
    }
  }
  setResponseStatus(event, 204)
  return null
})
