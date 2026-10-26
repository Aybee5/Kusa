import { eq } from 'drizzle-orm'

/** POST /api/auth/logout: end this session. */
export default defineEventHandler(async (event) => {
  const h = getHeader(event, 'authorization')
  if (h?.startsWith('Bearer ')) await useDb().delete(schema.sessions).where(eq(schema.sessions.tokenHash, sha256(h.slice(7).trim())))
  setResponseStatus(event, 204)
  return null
})
