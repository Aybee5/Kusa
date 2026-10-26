/** GET /api/auth/me: the signed-in user (used to refresh role and business). */
export default defineEventHandler(async (event) => toSessionUser(await requireUser(event)))
