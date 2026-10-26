import { z } from 'zod'

const Body = z.object({
  name: z.string().trim().min(2).max(80),
  price: z.number().int().min(50).max(50_000_000),
  description: z.string().trim().max(1000).default(''),
  imageKey: z.string().max(200).optional(),
})

/** POST /api/me/products: add a product. */
export default defineEventHandler(async (event) => {
  const { user, vendor } = await requireVendor(event)
  const body = await readValidatedBody(event, Body.parse)
  assertOwnKey(body.imageKey, 'product', user.id)
  const [row] = await useDb().insert(schema.products).values({
    vendorId: vendor.id, name: body.name, price: body.price, description: body.description,
    imageKey: body.imageKey ?? null, tint: vendor.coverTint, photoLabel: body.name,
  }).returning()
  setResponseStatus(event, 201)
  return toProduct(row!)
})
