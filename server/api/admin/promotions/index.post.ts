import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

const Body = z.object({
  kind: z.enum(['featured', 'banner', 'product']),
  vendorId: z.string().max(64).optional(),
  productId: z.string().max(64).optional(),
  headline: z.string().trim().max(60).optional(),
  imageKey: z.string().max(200).optional(),
  linkUrl: z.string().trim().max(300).refine((u) => /^https:\/\/\S+$/.test(u) || /^\/[\w\-/?=&.%]*$/.test(u), 'Use an https:// link or an in-app path like /vendor/signup').optional(),
  city: z.string().trim().min(1).max(60).nullable(),
  category: CategoryField.nullable(),
  durationDays: z.number().int().min(1).max(365),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  price: z.number().int().min(0).max(100_000_000),
})

/**
 * POST /api/admin/promotions: create a promotion directly (a deal agreed
 * outside the app, a free trial, or a house banner with no vendor). It's
 * approved straight away.
 */
export default defineEventHandler(async (event) => {
  const admin = await requireRole(event, 'admin')
  const body = await readValidatedBody(event, Body.parse)
  assertStartDate(body.startDate)
  const db = useDb()
  const { promotions: p, vendors, products } = schema

  if (body.kind !== 'banner' && !body.vendorId) throw createError({ statusCode: 400, message: 'Choose the business to promote' })
  if (body.vendorId) {
    const [v] = await db.select({ status: vendors.status }).from(vendors).where(eq(vendors.id, body.vendorId)).limit(1)
    if (v?.status !== 'verified') throw createError({ statusCode: 400, message: 'Only verified businesses can be promoted' })
  }
  if (body.kind === 'product' || body.productId) {
    const owned = body.vendorId && body.productId
      ? await db.select({ id: products.id }).from(products).where(and(eq(products.id, body.productId), eq(products.vendorId, body.vendorId))).limit(1)
      : []
    if (!owned.length) throw createError({ statusCode: 400, message: 'Choose a product from that business' })
  }
  if (body.kind === 'banner') {
    if (!body.headline || body.headline.length < 3) throw createError({ statusCode: 400, message: 'Write a headline for the banner' })
    if (!body.vendorId && !body.linkUrl) throw createError({ statusCode: 400, message: 'A banner without a business needs a link' })
    assertOwnKey(body.imageKey, 'banner', admin.id)
  }

  const { startsAt, endsAt } = scheduleFrom(lagosMidnight(body.startDate), body.durationDays)
  const isBanner = body.kind === 'banner'
  const [row] = await db.insert(p).values({
    kind: body.kind,
    vendorId: body.vendorId ?? null,
    productId: body.productId ?? null,
    headline: isBanner ? body.headline! : null,
    imageKey: isBanner ? body.imageKey ?? null : null,
    linkUrl: isBanner && !body.vendorId ? body.linkUrl! : null,
    city: body.city,
    category: body.category,
    durationDays: body.durationDays,
    price: body.price,
    startsAt,
    endsAt,
    status: 'approved',
    createdBy: admin.id,
    decidedAt: new Date(),
  }).returning()
  setResponseStatus(event, 201)
  return (await listPromotions(eq(p.id, row!.id)))[0]
})
