// API checks: start the server on a freshly seeded database (npm run db:reset && npm run dev), then `npm run test:api`.
// Uses the console SMS provider (codes come back in the response).
const B = (process.env.BASE || 'http://localhost:3000') + '/api'
const results = []
const ok = (name, cond, extra = '') => { results.push(`${cond ? 'PASS' : 'FAIL'} ${name} ${extra}`); return cond }

async function req(method, path, { token, body, query } = {}) {
  const url = new URL(B + path)
  for (const [k, v] of Object.entries(query ?? {})) url.searchParams.set(k, String(v))
  const res = await fetch(url, {
    method,
    headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { data = text }
  return { status: res.status, data, headers: res.headers }
}
async function signIn(phone, name) {
  const c = await req('POST', '/auth/code', { body: { phone } })
  if (c.status !== 200) throw new Error(`code ${phone}: ${c.status} ${JSON.stringify(c.data)}`)
  const v = await req('POST', '/auth/verify', { body: { phone, code: c.data.devCode, name } })
  if (v.status !== 200) throw new Error(`verify ${phone}: ${v.status} ${JSON.stringify(v.data)}`)
  return v.data
}
// 1x1 PNG
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

try {
  // Public
  let r = await req('GET', '/vendors', { query: { radiusKm: 3, sort: 'top-rated', lat: 11.9965, lng: 8.531 } })
  ok('search within 3 km', r.status === 200 && r.data.length > 0 && r.data.every((v) => v.distanceKm <= 3), `${r.data.length} results`)
  ok('top rated order', r.data.every((v, i, a) => i === 0 || a[i - 1].rating.average >= v.rating.average))
  r = await req('GET', '/vendors', { query: { minRating: 4.5 } })
  ok('min rating filter', r.data.every((v) => v.rating.average >= 4.5), `${r.data.length}`)
  r = await req('GET', '/vendors', { query: { q: 'chin chin' } })
  ok('search by product text', r.data.some((v) => v.slug === 'crunch-and-co'))
  r = await req('GET', '/vendors', { query: { category: 'jewellery' } })
  ok('category filter', r.data.length > 0 && r.data.every((v) => v.category === 'jewellery'))
  ok('pending vendor not public', (await req('GET', '/vendors/zainab-beads')).status === 404)
  ok('suspended vendor not public', (await req('GET', '/vendors/glow-by-amina')).status === 404)
  r = await req('GET', '/products/latest', { query: { limit: 4 } })
  ok('latest products', r.status === 200 && r.data.length === 4)
  r = await req('GET', '/vendors', { query: { sort: 'nearest' } })
  ok('browse anywhere: no distances', r.status === 200 && r.data.length > 0 && r.data.every((v) => v.distanceKm === null))
  ok('browse anywhere: best rated first', r.data.every((v, i, a) => i === 0 || a[i - 1].rating.average >= v.rating.average))
  r = await req('GET', '/vendors', { query: { radiusKm: 1, lat: 11.9965, lng: 8.531, sort: 'nearest' } })
  ok('nearest first within 1 km', r.data.length > 0 && r.data.every((v, i, a) => v.distanceKm <= 1 && (i === 0 || a[i - 1].distanceKm <= v.distanceKm)), `${r.data.length}`)
  r = await req('GET', '/vendors', { query: { radiusKm: 5, lat: 9.0765, lng: 7.3986 } })
  ok('another city: nothing near Abuja', r.status === 200 && r.data.length === 0)
  r = await req('GET', '/areas')
  ok('areas list', r.status === 200 && r.data.some((a) => a.area === 'Tarauni' && a.city === 'Kano' && a.count >= 1), `${r.data.length} areas`)
  r = await req('GET', '/health')
  ok('health', r.data?.ok === true, `geo=${r.data?.geoSearch}`)
  if (process.env.EXPECT_GEO) ok(`geo mode is ${process.env.EXPECT_GEO}`, r.data?.geoSearch === process.env.EXPECT_GEO)
  ok('bad query rejected', (await req('GET', '/vendors', { query: { sort: 'nope' } })).status === 400)

  // Auth
  ok('bad phone rejected', (await req('POST', '/auth/code', { body: { phone: '123' } })).status === 400)
  const phone = '08061234567'
  r = await req('POST', '/auth/code', { body: { phone } })
  ok('code sent', r.status === 200 && r.data.devCode)
  ok('resend rate limited', (await req('POST', '/auth/code', { body: { phone } })).status === 429)
  ok('wrong code rejected', (await req('POST', '/auth/verify', { body: { phone, code: '000000' } })).status === 400)
  r = await req('POST', '/auth/verify', { body: { phone, code: '123456', name: 'Test Shopper' } })
  ok('new shopper signs in', r.status === 200 && r.data.token && r.data.user.role === 'shopper')
  const shopper = r.data
  ok('code single use', (await req('POST', '/auth/verify', { body: { phone, code: '123456' } })).status === 400)
  ok('me', (await req('GET', '/auth/me', { token: shopper.token })).data?.name === 'Test Shopper')
  ok('no token 401', (await req('GET', '/auth/me')).status === 401)
  ok('shopper cannot use admin', (await req('GET', '/admin/vendors', { token: shopper.token })).status === 403)

  // Ratings
  r = await req('POST', '/vendors/bite-box-kano/reviews', { token: shopper.token, body: { stars: 4, tags: ['On time'], text: 'Came warm.' } })
  ok('rate a business', r.status === 200 && r.data.status === 'published')
  r = await req('POST', '/vendors/bite-box-kano/reviews', { token: shopper.token, body: { stars: 5, tags: [], text: 'Even better the second time.' } })
  ok('rating again updates it', r.data.stars === 5)
  r = await req('GET', '/vendors/bite-box-kano/reviews/mine', { token: shopper.token })
  ok('my review', r.data?.stars === 5)
  r = await req('GET', '/vendors/bite-box-kano/reviews')
  ok('review shows publicly', r.data.some((x) => x.text === 'Even better the second time.'))
  ok('invalid stars rejected', (await req('POST', '/vendors/bite-box-kano/reviews', { token: shopper.token, body: { stars: 9 } })).status === 400)
  const reviewId = r.data.find((x) => x.text === 'Even better the second time.').id

  // Vendor owner reports it; can't rate own business
  const owner = await signIn('08090005521')
  ok('vendor owner signs in as vendor', owner.user.role === 'vendor' && owner.user.vendorId === 'v7')
  ok('cannot rate own business', (await req('POST', '/vendors/v7/reviews', { token: owner.token, body: { stars: 5 } })).status === 403)
  ok('report review', (await req('POST', `/reviews/${reviewId}/report`, { token: owner.token, body: { reason: 'Never ordered' } })).status === 204)

  // Traffic
  const before = (await req('GET', '/me/vendor/stats', { token: owner.token })).data.daily.at(-1)
  await req('POST', '/vendors/bite-box-kano/events', { body: { event: 'view', firstVisitToday: true, source: 'map' } })
  await req('POST', '/vendors/bite-box-kano/events', { body: { event: 'view', firstVisitToday: false, source: 'search' } })
  await req('POST', '/vendors/bite-box-kano/events', { body: { event: 'whatsapp' } })
  const after = (await req('GET', '/me/vendor/stats', { token: owner.token })).data
  const today = after.daily.at(-1)
  ok('views counted', today.views === before.views + 2 && today.visitors === before.visitors + 1 && today.whatsapp === before.whatsapp + 1,
    `${before.views}->${today.views}`)
  ok('60 days of stats', after.daily.length === 60 && after.sources.length > 0)

  // New vendor: register, upload, verify
  const newbie = await signIn('07031234567', 'Rukayya Musa')
  r = await req('POST', '/me/vendor', { token: newbie.token, body: { name: 'Rukayya Cakes', category: 'cakes', whatsapp: '07031234567', area: 'Zoo Road', city: 'Kano', landmark: 'Near the roundabout', lat: 12.0, lng: 8.53, delivery: true, pickup: false } })
  ok('register business', r.status === 200 && r.data.user.role === 'vendor' && r.data.vendor.status === 'pending', r.data?.vendor?.slug)
  const newVendorId = r.data.vendor.id
  ok('second business refused', (await req('POST', '/me/vendor', { token: newbie.token, body: { name: 'Again', category: 'cakes', whatsapp: '07031234567', area: 'Zoo Road', city: 'Kano', landmark: '', lat: 12, lng: 8.5, delivery: true, pickup: true } })).status === 409)
  ok('non-image upload rejected', (await req('POST', '/uploads', { token: newbie.token, body: { kind: 'verification', dataUrl: 'data:image/png;base64,aGVsbG8=' } })).status === 400)
  const id = (await req('POST', '/uploads', { token: newbie.token, body: { kind: 'verification', dataUrl: PNG } })).data
  const selfie = (await req('POST', '/uploads', { token: newbie.token, body: { kind: 'verification', dataUrl: PNG } })).data
  ok('verification upload private', id.key?.startsWith('verification/') && id.url === null)
  ok('private file blocked', (await req('GET', `/files/${id.key}`)).status === 403)
  ok('someone else’s key refused', (await req('POST', '/me/vendor/verification', { token: owner.token, body: { idType: 'NIN slip', idPhotoKey: id.key, selfieKey: selfie.key } })).status === 400)
  r = await req('POST', '/me/vendor/verification', { token: newbie.token, body: { idType: 'NIN slip', idPhotoKey: id.key, selfieKey: selfie.key } })
  ok('submit verification', r.status === 200 && r.data.documents.hasSelfie)
  const prodImg = (await req('POST', '/uploads', { token: newbie.token, body: { kind: 'product', dataUrl: PNG } })).data
  ok('product photo public', prodImg.url && (await fetch(B.replace('/api', '') + prodImg.url)).status === 200)
  r = await req('POST', '/me/products', { token: newbie.token, body: { name: 'Cupcakes x6', price: 7000, description: 'Vanilla', imageKey: prodImg.key } })
  ok('create product', r.status === 201 && r.data.image)
  ok('toggle availability', (await req('PATCH', `/me/products/${r.data.id}`, { token: newbie.token, body: { available: false } })).data?.available === false)
  ok('pending business hidden', (await req('GET', `/vendors/${newVendorId}`)).status === 404)

  // Admin
  const admin = await signIn('08000000001')
  ok('admin signs in', admin.user.role === 'admin')
  r = await req('GET', `/admin/vendors/${newVendorId}`, { token: admin.token })
  ok('admin sees signed document links', !!r.data.documentUrls?.id)
  ok('signed link works', (await fetch(B.replace('/api', '') + r.data.documentUrls.id)).status === 200)
  ok('approve vendor', (await req('PATCH', `/admin/vendors/${newVendorId}`, { token: admin.token, body: { status: 'verified' } })).data?.status === 'verified')
  ok('approved business is public', (await req('GET', `/vendors/${newVendorId}`)).status === 200)
  r = await req('GET', '/vendors', { query: { radiusKm: 2, lat: 12.0, lng: 8.53 } })
  ok('new business found by location', r.data.some((v) => v.id === newVendorId))
  ok('suspend needs reason', (await req('PATCH', '/admin/vendors/v9', { token: admin.token, body: { status: 'suspended' } })).status === 400)
  ok('suspend vendor', (await req('PATCH', '/admin/vendors/v9', { token: admin.token, body: { status: 'suspended', reason: 'Misleading listings' } })).data?.suspensionReason === 'Misleading listings')
  r = await req('GET', '/admin/reviews', { token: admin.token })
  const flagged = r.data.filter((x) => x.status === 'flagged')
  ok('reported review is flagged', flagged.some((x) => x.id === reviewId), `${flagged.length} flagged`)
  ok('hide review', (await req('PATCH', `/admin/reviews/${reviewId}`, { token: admin.token, body: { status: 'hidden' } })).data?.status === 'hidden')
  r = await req('GET', '/vendors/bite-box-kano/reviews')
  ok('hidden review gone publicly', !r.data.some((x) => x.id === reviewId))
  r = await req('GET', '/admin/shoppers', { token: admin.token })
  ok('shopper list', r.data.some((s) => s.name === 'Test Shopper'))
  const s = r.data.find((x) => x.name === 'Test Shopper')
  ok('suspend shopper', (await req('PATCH', `/admin/shoppers/${s.id}`, { token: admin.token, body: { status: 'suspended', reason: 'Spam' } })).status === 204)
  ok('suspended shopper signed out', (await req('GET', '/auth/me', { token: shopper.token })).status === 401)

  // CORS for the native apps
  const pre = await fetch(B + '/vendors', { method: 'OPTIONS', headers: { origin: 'capacitor://localhost', 'access-control-request-method': 'GET', 'access-control-request-headers': 'authorization' } })
  ok('CORS preflight for app', pre.headers.get('access-control-allow-origin') === 'capacitor://localhost', `${pre.status}`)
  const bad = await fetch(B + '/vendors', { headers: { origin: 'https://evil.example' } })
  ok('CORS blocks other sites', !bad.headers.get('access-control-allow-origin'))
} catch (e) {
  results.push('ERROR ' + e.stack)
}
console.log(results.join('\n'))
console.log(`\n${results.filter((x) => x.startsWith('PASS')).length}/${results.length} passed`)
process.exitCode = results.every((r) => r.startsWith('PASS')) ? 0 : 1
