/**
 * GET /api/files/:key: product photos are public; verification photos need a
 * valid signed link (?exp&sig) from an admin endpoint.
 */
export default defineEventHandler(async (event) => {
  const key = getRouterParam(event, 'key') ?? ''
  if (!/^(product|verification)\/[\w-]+\/[\w-]+\.(jpg|png|webp)$/.test(key)) throw createError({ statusCode: 404 })
  const isPublic = key.startsWith('product/')
  if (!isPublic) {
    const q = getQuery(event)
    if (!checkFileSignature(key, q.exp, q.sig)) throw createError({ statusCode: 403, statusMessage: 'This link has expired' })
  }
  const data = await uploads().getItemRaw(key)
  if (!data) throw createError({ statusCode: 404 })
  setResponseHeaders(event, {
    'Content-Type': contentTypeFor(key),
    'Cache-Control': isPublic ? 'public, max-age=31536000, immutable' : 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  })
  return data
})
