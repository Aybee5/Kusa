import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

const Body = z.object({
  status: z.enum(['active', 'flagged', 'suspended']),
  reason: z.string().trim().max(300).optional(),
})

/** PATCH /api/admin/shoppers/:id: clear a flag, suspend (signs them out everywhere) or reinstate. */
export default defineEventHandler(async (event) => {
  await requireRole(event, 'admin')
  const { status, reason } = await readValidatedBody(event, Body.parse)
  if (status === 'suspended' && !reason) throw createError({ statusCode: 400, message: 'Give a reason for the suspension' })
  const id = getRouterParam(event, 'id')!
  const db = useDb()
  const [row] = await db.update(schema.users).set({ status, suspensionReason: status === 'suspended' ? reason : null })
    .where(and(eq(schema.users.id, id), eq(schema.users.role, 'shopper'))).returning()
  if (!row) throw createError({ statusCode: 404, message: 'Shopper not found' })
  if (status === 'suspended') await db.delete(schema.sessions).where(eq(schema.sessions.userId, id))
  setResponseStatus(event, 204)
  return null
})
