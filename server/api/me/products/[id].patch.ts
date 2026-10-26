import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

const Body = z.object({ available: z.boolean() })

/** PATCH /api/me/products/:id: mark a product available or sold out. */
export default defineEventHandler(async (event) => {
  const { vendor } = await requireVendor(event)
  const { available } = await readValidatedBody(event, Body.parse)
  const [row] = await useDb().update(schema.products).set({ available })
    .where(and(eq(schema.products.id, getRouterParam(event, 'id')!), eq(schema.products.vendorId, vendor.id))).returning()
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Product not found' })
  return toProduct(row)
})
