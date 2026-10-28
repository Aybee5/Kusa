import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

const Body = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  price: z.number().int().min(50).max(50_000_000).optional(),
  description: z.string().trim().max(1000).optional(),
  imageKey: z.string().max(200).nullable().optional(),
  options: ProductOptions.optional(),
  available: z.boolean().optional(),
})

/** PATCH /api/me/products/:id: edit a product or mark it available / sold out. imageKey null removes the photo. */
export default defineEventHandler(async (event) => {
  const { user, vendor } = await requireVendor(event)
  const body = await readValidatedBody(event, Body.parse)
  if (body.imageKey) assertOwnKey(body.imageKey, 'product', user.id)
  const db = useDb()
  const { products } = schema
  const where = and(eq(products.id, getRouterParam(event, 'id')!), eq(products.vendorId, vendor.id))
  const [current] = await db.select().from(products).where(where).limit(1)
  if (!current) throw createError({ statusCode: 404, message: 'Product not found' })

  const options = body.options !== undefined ? (body.options.length ? body.options : null) : current.options
  const [row] = await db.update(products).set({
    ...(body.name !== undefined ? { name: body.name, photoLabel: body.name } : {}),
    ...(body.description !== undefined ? { description: body.description } : {}),
    ...(body.imageKey !== undefined ? { imageKey: body.imageKey } : {}),
    ...(body.available !== undefined ? { available: body.available } : {}),
    ...(body.options !== undefined || body.price !== undefined ? { options, price: basePrice(body.price ?? current.price, options ?? undefined) } : {}),
  }).where(where).returning()
  return toProduct(row!)
})
