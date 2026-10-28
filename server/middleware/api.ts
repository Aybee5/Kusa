// For /api requests: allow the native apps (and any CORS_ORIGINS) to call the
// API, and wait until database migrations have finished.
export default defineEventHandler(async (event) => {
  if (!event.path.startsWith('/api/')) return
  const handled = handleCors(event, {
    origin: (origin) => serverConfig().corsOrigins.includes(origin),
    methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    allowHeaders: ['authorization', 'content-type'],
    maxAge: '86400',
  })
  if (handled) return
  setResponseHeader(event, 'Cache-Control', 'no-store')
  await dbReady()
})
