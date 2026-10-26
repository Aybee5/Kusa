import { eq } from 'drizzle-orm'
import { z } from 'zod'

const Body = z.object({
  status: z.enum(['pending', 'verified', 'changes', 'rejected', 'suspended']),
  reason: z.string().trim().max(500).optional(),
})

/**
 * PATCH /api/admin/vendors/:id: approve, request changes, reject, suspend or
 * reinstate. Suspending needs a reason; it's shown to the vendor.
 */
export default defineEventHandler(async (event) => {
  await requireRole(event, 'admin')
  const { status, reason } = await readValidatedBody(event, Body.parse)
  if (status === 'suspended' && !reason) throw createError({ statusCode: 400, statusMessage: 'Give a reason for the suspension' })
  const [row] = await useDb().update(schema.vendors).set({
    status,
    suspensionReason: status === 'suspended' ? reason : null,
    reviewNote: status === 'changes' || status === 'rejected' ? reason || null : null,
    ...(status === 'verified' ? { verifiedAt: new Date() } : {}),
  }).where(eq(schema.vendors.id, getRouterParam(event, 'id')!)).returning()
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Business not found' })
  // A real deployment would text the vendor here (approved, changes needed, suspended).
  const [vendor] = await toAdminVendors([row], true)
  return vendor
})
