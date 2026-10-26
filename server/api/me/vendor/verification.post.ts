import { eq } from 'drizzle-orm'
import { z } from 'zod'

const Body = z.object({
  idType: z.enum(['NIN slip', "Voter's card", "Driver's licence", 'International passport']),
  idPhotoKey: z.string().max(200),
  selfieKey: z.string().max(200),
  proofKey: z.string().max(200).optional(),
})

/** POST /api/me/vendor/verification: send ID, selfie and optional proof of business for review. */
export default defineEventHandler(async (event) => {
  const { user, vendor } = await requireVendor(event)
  if (vendor.status === 'verified' || vendor.status === 'suspended') {
    throw createError({ statusCode: 400, statusMessage: 'This business doesn’t need verifying right now' })
  }
  const body = await readValidatedBody(event, Body.parse)
  for (const key of [body.idPhotoKey, body.selfieKey, body.proofKey]) assertOwnKey(key, 'verification', user.id)
  const [v] = await useDb().update(schema.vendors).set({
    idType: body.idType, idPhotoKey: body.idPhotoKey, selfieKey: body.selfieKey, proofKey: body.proofKey ?? null,
    status: 'pending', reviewNote: null, submittedAt: new Date(),
  }).where(eq(schema.vendors.id, vendor.id)).returning()
  return toVendor(v!, user.name)
})
