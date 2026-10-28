import { and, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { CATEGORIES } from '#shared/utils/catalog'

const Body = z.object({
  kind: z.enum(['featured', 'banner', 'product']),
  productId: z.string().max(64).optional(),
  headline: z.string().trim().max(60).optional(),
  imageKey: z.string().max(200).optional(),
  city: z.string().trim().min(1).max(60).nullable(),
  category: z.enum(CATEGORIES.map((c) => c.id) as [string, ...string[]]).nullable(),
  durationDays: z.number().int(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  paymentRef: z.string().trim().max(80).optional(),
})

const MAX_PENDING = 3

/**
 * POST /api/me/promotions: request a promotion. It waits for an admin to
 * confirm payment and approve it; the price is fixed now from the plan.
 */
export default defineEventHandler(async (event) => {
  const { user, vendor } = await requireVendor(event)
  if (vendor.status !== 'verified') throw createError({ statusCode: 403, message: 'Your business needs to be verified before you can promote it' })
  const body = await readValidatedBody(event, Body.parse)
  const price = planPrice(body.kind, body.durationDays)
  if (price === undefined) throw createError({ statusCode: 400, message: 'Choose one of the listed durations' })
  assertStartDate(body.startDate)

  const db = useDb()
  const { promotions: p, products } = schema
  const ownsProduct = async (id: string | undefined) =>
    !!id && (await db.select({ id: products.id }).from(products).where(and(eq(products.id, id), eq(products.vendorId, vendor.id))).limit(1)).length > 0

  let productId: string | null = null
  if (body.kind === 'product' || (body.kind === 'banner' && body.productId)) {
    if (!(await ownsProduct(body.productId))) throw createError({ statusCode: 400, message: 'Choose one of your products' })
    productId = body.productId!
  }
  if (body.kind === 'banner') {
    if (!body.headline || body.headline.length < 3) throw createError({ statusCode: 400, message: 'Write a headline for your banner' })
    assertOwnKey(body.imageKey, 'banner', user.id)
  }

  const [{ pending }] = await db.select({ pending: sql<number>`count(*)::int` }).from(p)
    .where(and(eq(p.vendorId, vendor.id), eq(p.status, 'pending'))) as [{ pending: number }]
  if (pending >= MAX_PENDING) throw createError({ statusCode: 429, message: `You have ${pending} requests waiting. Cancel one or wait for a reply.` })

  const startsAt = lagosMidnight(body.startDate)
  const [row] = await db.insert(p).values({
    kind: body.kind,
    vendorId: vendor.id,
    productId,
    headline: body.kind === 'banner' ? body.headline! : null,
    imageKey: body.kind === 'banner' ? body.imageKey ?? null : null,
    city: body.city,
    category: body.category,
    durationDays: body.durationDays,
    price,
    startsAt,
    endsAt: new Date(startsAt.getTime() + body.durationDays * 86400000),
    paymentRef: body.paymentRef || null,
    createdBy: user.id,
  }).returning()
  // A real deployment would let admins know here (email or SMS).
  setResponseStatus(event, 201)
  return (await listPromotions(eq(p.id, row!.id)))[0]
})
