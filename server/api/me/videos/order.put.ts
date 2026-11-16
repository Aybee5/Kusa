import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

const Body = z.object({ ids: z.array(z.string().max(64)).max(50) })

/** PUT /api/me/videos/order: set the order shoppers see the videos in. */
export default defineEventHandler(async (event) => {
  const { vendor } = await requireVendor(event)
  const { ids } = await readValidatedBody(event, Body.parse)
  const { vendorVideos } = schema
  const current = await listVendorVideos(vendor.id, false)
  const known = new Set(current.map((v) => v.id))
  if (ids.length !== known.size || new Set(ids).size !== ids.length || ids.some((id) => !known.has(id))) {
    throw createError({ statusCode: 400, message: 'Send every one of your videos once' })
  }
  await useDb().transaction(async (tx) => {
    for (const [i, id] of ids.entries()) {
      await tx.update(vendorVideos).set({ position: i }).where(and(eq(vendorVideos.id, id), eq(vendorVideos.vendorId, vendor.id)))
    }
  })
  return (await listVendorVideos(vendor.id, false)).map(toMyVendorVideo)
})
