/** GET /api/admin/promotions: every promotion and request, newest first. */
export default defineEventHandler(async (event) => {
  await requireRole(event, 'admin')
  return listPromotions()
})
