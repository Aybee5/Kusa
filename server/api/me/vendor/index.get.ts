/** GET /api/me/vendor: the signed-in vendor's business (any status). */
export default defineEventHandler(async (event) => {
  const { user, vendor } = await requireVendor(event)
  return toVendor(vendor, user.name)
})
