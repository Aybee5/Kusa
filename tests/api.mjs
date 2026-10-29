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
const todayLagos = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
async function signInEmail(email, name) {
  const c = await req('POST', '/auth/code', { body: { email } })
  if (c.status !== 200) throw new Error(`code ${email}: ${c.status} ${JSON.stringify(c.data)}`)
  const v = await req('POST', '/auth/verify', { body: { email, code: c.data.devCode, name } })
  if (v.status !== 200) throw new Error(`verify ${email}: ${v.status} ${JSON.stringify(v.data)}`)
  return v.data
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
  let r
  const methods = (await req('GET', '/auth/options')).data?.methods ?? []
  if (process.env.EXPECT_METHODS) ok(`sign-in methods are ${process.env.EXPECT_METHODS}`, methods.join(',') === process.env.EXPECT_METHODS, methods.join(','))
  if (!methods.includes('phone')) {
    // Email-only deployment: phone codes are refused; everyone signs in by email.
    ok('phone sign-in refused when off', (await req('POST', '/auth/code', { body: { phone: '08061234567' } })).status === 400)
    const v = await signInEmail('mama-hadiza-small-chops@demo.kusa.ng')
    ok('demo vendor signs in by email', v.user.role === 'vendor' && v.user.vendorId === 'v1' && v.user.email === 'mama-hadiza-small-chops@demo.kusa.ng')
    const a = await signInEmail('admin@demo.kusa.ng')
    ok('demo admin signs in by email', a.user.role === 'admin')
    const n = await signInEmail('New.Seller@Example.com', 'New Seller')
    ok('new account by email, stored lower-case', n.user.role === 'shopper' && n.user.email === 'new.seller@example.com' && n.user.phone === null)
    r = await req('POST', '/me/vendor', { token: n.token, body: { name: 'Seller Snacks', category: 'snacks', phone: '08021112222', whatsapp: null, instagram: 'sellersnacks', showPhone: true, primaryContact: 'instagram', area: 'Sharada', city: 'Kano', landmark: '', lat: 11.98, lng: 8.5, delivery: true, pickup: true } })
    ok('email account registers a business with a phone number', r.status === 200 && r.data.vendor.phone === '+2348021112222' && r.data.vendor.instagram === 'sellersnacks')
    ok('old "snacks" category becomes small chops & snacks', r.data.vendor.category === 'small-chops')
    throw new Error('done')
  }

  // Public
  r = await req('GET', '/vendors', { query: { radiusKm: 3, sort: 'top-rated', lat: 11.9965, lng: 8.531 } })
  ok('search within 3 km', r.status === 200 && r.data.length > 0 && r.data.every((v) => v.distanceKm <= 3), `${r.data.length} results`)
  ok('top rated order', r.data.every((v, i, a) => i === 0 || a[i - 1].rating.average >= v.rating.average))
  r = await req('GET', '/vendors', { query: { minRating: 4.5 } })
  ok('min rating filter', r.data.every((v) => v.rating.average >= 4.5), `${r.data.length}`)
  r = await req('GET', '/vendors', { query: { q: 'chin chin' } })
  ok('search by product text', r.data.some((v) => v.slug === 'crunch-and-co'))
  r = await req('GET', '/vendors', { query: { category: 'snacks' } })
  ok('old snacks links show small chops & snacks', r.status === 200 && r.data.some((v) => v.slug === 'crunch-and-co') && r.data.every((v) => v.category === 'small-chops'))
  r = await req('GET', '/vendors', { query: { category: 'clothing' } })
  ok('clothing category', r.data.length === 3 && r.data.every((v) => v.category === 'clothing'))
  r = await req('GET', '/vendors', { query: { q: 'abaya' } })
  ok('searching "abaya" finds clothing businesses', r.data.some((v) => v.slug === 'zahra-abaya-house'))
  r = await req('GET', '/vendors', { query: { q: 'kaftan', state: 'Kano' } })
  ok('searching "kaftan" in Kano', r.data.length >= 1 && r.data.every((v) => v.state === 'Kano') && r.data.some((v) => v.slug === 'sadiq-kaftan-and-babban-riga'))
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
  // Browse by state / city, without a location (like a classifieds site)
  r = await req('GET', '/vendors', { query: { state: 'Lagos' } })
  ok('browse a state', r.status === 200 && r.data.length === 3 && r.data.every((v) => v.state === 'Lagos' && v.distanceKm === null), r.data.map((v) => v.city).join(','))
  ok('state results best rated first', r.data.every((v, i, a) => i === 0 || a[i - 1].rating.average >= v.rating.average))
  r = await req('GET', '/vendors', { query: { state: 'lagos', city: 'lekki' } })
  ok('browse a city in a state', r.data.length === 1 && r.data[0].slug === 'lekki-cakes-by-tolu')
  r = await req('GET', '/vendors', { query: { state: 'Abuja' } })
  ok('"Abuja" means the FCT', r.data.length === 1 && r.data[0].state === 'FCT')
  r = await req('GET', '/vendors', { query: { state: 'Kano', category: 'cakes' } })
  ok('state works with other filters', r.data.length > 0 && r.data.every((v) => v.state === 'Kano' && v.category === 'cakes'))
  ok('unknown state rejected', (await req('GET', '/vendors', { query: { state: 'Narnia' } })).status === 400)
  ok('state with no businesses yet is empty', (await req('GET', '/vendors', { query: { state: 'Ogun' } })).data.length === 0)
  r = await req('GET', '/products/latest', { query: { state: 'Kaduna', limit: 8 } })
  ok('latest products in a state', r.data.length === 2 && r.data.every((x) => x.vendor.state === 'Kaduna'))
  r = await req('GET', '/promoted', { query: { placement: 'search', state: 'Lagos' } })
  ok('sponsored slots follow the state', r.data.featured.every((v) => v.state === 'Lagos') && r.data.banners.every((b) => b.sponsor === 'Kusa') && r.data.products.length === 0,
    `${r.data.featured.length}/${r.data.banners.map((b) => b.sponsor)}`)
  r = await req('GET', '/promoted', { query: { placement: 'home', state: 'Kano' } })
  ok('Kano promotions show when browsing Kano', r.data.featured.length >= 2 && r.data.products.length === 1)
  r = await req('GET', '/areas')
  ok('areas list includes states', r.data.some((a) => a.state === 'Lagos' && a.city === 'Ikeja') && r.data.some((a) => a.state === 'FCT'))
  r = await req('GET', '/areas')
  ok('areas list', r.status === 200 && r.data.some((a) => a.area === 'Tarauni' && a.city === 'Kano' && a.count >= 1), `${r.data.length} areas`)
  r = await req('GET', '/health')
  ok('health', r.data?.ok === true, `geo=${r.data?.geoSearch}`)
  if (process.env.EXPECT_GEO) ok(`geo mode is ${process.env.EXPECT_GEO}`, r.data?.geoSearch === process.env.EXPECT_GEO)
  ok('bad query rejected', (await req('GET', '/vendors', { query: { sort: 'nope' } })).status === 400)
  r = await req('GET', '/vendors', { query: { openNow: true } })
  ok('open now filter', r.status === 200 && r.data.every((v) => v.openState.open), `${r.data.length}`)
  r = await req('GET', '/vendors', { query: { minRating: 4.5, lat: 11.9965, lng: 8.531, radiusKm: 10, sort: 'nearest' } })
  ok('rating filter with nearest sort', r.data.length > 0 && r.data.every((v, i, a) => v.rating.average >= 4.5 && (i === 0 || a[i - 1].distanceKm <= v.distanceKm)), `${r.data.length}`)
  r = await req('GET', '/vendors')
  ok('stored averages match their star counts', r.data.every(({ rating: x }) => {
    const n = x.breakdown.reduce((a, b) => a + b, 0)
    const avg = n ? Math.round((x.breakdown.reduce((t, c, i) => t + c * (5 - i), 0) / n) * 10) / 10 : 0
    return n === x.count && avg === x.average
  }))

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
  ok('bad email rejected', (await req('POST', '/auth/code', { body: { email: 'not-an-email' } })).status === 400)
  r = await req('POST', '/auth/code', { body: { email: 'Halima@Example.com' } })
  ok('email code sent', r.status === 200 && r.data.devCode)
  ok('email code is per address', (await req('POST', '/auth/verify', { body: { email: 'other@example.com', code: '123456' } })).status === 400)
  r = await req('POST', '/auth/verify', { body: { email: 'halima@example.com', code: '123456', name: 'Halima' } })
  ok('new shopper signs in by email', r.status === 200 && r.data.user.email === 'halima@example.com' && r.data.user.phone === null)
  const emailUser = r.data
  r = await signInEmail('HALIMA@example.com')
  ok('same account next time', r.user.id === emailUser.user.id)
  ok('phone and email accounts are separate', emailUser.user.id !== shopper.user.id)

  // Ratings (the stored totals must follow every change)
  const ratingOf = async (slug) => (await req('GET', `/vendors/${slug}`)).data.rating
  const base = await ratingOf('bite-box-kano')
  const crunchBase = await ratingOf('crunch-and-co')
  r = await req('POST', '/vendors/bite-box-kano/reviews', { token: shopper.token, body: { stars: 4, tags: ['On time'], text: 'Came warm.' } })
  ok('rate a business', r.status === 200 && r.data.status === 'published')
  r = await req('POST', '/vendors/bite-box-kano/reviews', { token: shopper.token, body: { stars: 5, tags: [], text: 'Even better the second time.' } })
  ok('rating again updates it', r.data.stars === 5)
  let now = await ratingOf('bite-box-kano')
  ok('rating counted once, as 5 stars', now.count === base.count + 1 && now.breakdown[0] === base.breakdown[0] + 1 && now.breakdown[1] === base.breakdown[1], `${base.count}->${now.count}`)
  await req('POST', '/vendors/crunch-and-co/reviews', { token: shopper.token, body: { stars: 3 } })
  ok('second business counted', (await ratingOf('crunch-and-co')).count === crunchBase.count + 1)
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
  now = await ratingOf('bite-box-kano')
  ok('reported review stops counting', now.count === base.count && now.average === base.average)

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
  r = await req('POST', '/me/vendor', { token: newbie.token, body: { name: 'Rukayya Cakes', category: 'cakes', phone: '07031234567', whatsapp: '07031234567', instagram: null, showPhone: true, primaryContact: 'whatsapp', area: 'Zoo Road', city: 'Kano', landmark: 'Near the roundabout', lat: 12.0, lng: 8.53, delivery: true, pickup: false } })
  ok('state guessed from the pin when not given', r.data?.vendor?.state === 'Kano')
  ok('register business', r.status === 200 && r.data.user.role === 'vendor' && r.data.vendor.status === 'pending', r.data?.vendor?.slug)
  const newVendorId = r.data.vendor.id
  const reg = { name: 'X Shop', category: 'cakes', phone: '07031234568', whatsapp: null, instagram: null, showPhone: true, primaryContact: 'phone', area: 'Zoo Road', city: 'Kano', landmark: '', lat: 12, lng: 8.5, delivery: true, pickup: true }
  const other = await signIn('07031234568', 'Other Seller')
  ok('main button must be switched on', (await req('POST', '/me/vendor', { token: other.token, body: { ...reg, primaryContact: 'whatsapp' } })).status === 400)
  ok('at least one way to reach them', (await req('POST', '/me/vendor', { token: other.token, body: { ...reg, showPhone: false } })).status === 400)
  ok('bad Instagram username rejected', (await req('POST', '/me/vendor', { token: other.token, body: { ...reg, instagram: 'not a handle!' } })).status === 400)
  r = await req('POST', '/me/vendor', { token: other.token, body: { ...reg, instagram: 'https://instagram.com/X.Shop.Kano/', primaryContact: 'instagram', showPhone: false } })
  ok('Instagram-only business', r.status === 200 && r.data.vendor.instagram === 'x.shop.kano' && r.data.vendor.whatsapp === null && r.data.vendor.primaryContact === 'instagram' && !r.data.vendor.showPhone)
  ok('second business refused', (await req('POST', '/me/vendor', { token: newbie.token, body: { name: 'Again', category: 'cakes', phone: '07031234567', whatsapp: null, instagram: null, showPhone: true, primaryContact: 'phone', area: 'Zoo Road', city: 'Kano', landmark: '', lat: 12, lng: 8.5, delivery: true, pickup: true } })).status === 409)
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
  ok('unverified business cannot promote', (await req('POST', '/me/promotions', { token: newbie.token, body: { kind: 'featured', city: 'Kano', category: null, durationDays: 7, startDate: todayLagos() } })).status === 403)

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
  ok('suspended shopper’s ratings stop counting', (await ratingOf('crunch-and-co')).count === crunchBase.count)
  await req('PATCH', `/admin/shoppers/${s.id}`, { token: admin.token, body: { status: 'active' } })
  ok('reinstated shopper’s ratings count again', (await ratingOf('crunch-and-co')).count === crunchBase.count + 1)
  r = await req('GET', '/admin/vendors', { token: admin.token })
  ok('admin list shows stored rating', r.data.find((v) => v.slug === 'crunch-and-co')?.ratingCount === crunchBase.count + 1)

  // Shop editing
  ok('closing must be after opening', (await req('PATCH', '/me/vendor', { token: owner.token, body: { hours: { opens: '18:00', closes: '09:00', closedDays: [] } } })).status === 400)
  r = await req('PATCH', '/me/vendor', { token: owner.token, body: { about: 'Fresh small chops daily.', hours: { opens: '10:30', closes: '22:00', closedDays: [5, 0, 5] }, landmark: 'Opposite the mosque' } })
  ok('vendor edits about, hours and landmark', r.status === 200 && r.data.about === 'Fresh small chops daily.' && r.data.hours.opens === '10:30' && r.data.hours.closedDays.join() === '0,5' && r.data.landmark === 'Opposite the mosque',
    `${r.status} ${r.data?.message ?? ''}`)
  r = await req('PATCH', '/me/vendor', { token: owner.token, body: { instagram: '@biteboxkano', primaryContact: 'instagram' } })
  ok('unknown state refused', (await req('PATCH', '/me/vendor', { token: owner.token, body: { state: 'Gotham' } })).status === 400)
  r = await req('PATCH', '/me/vendor', { token: owner.token, body: { state: 'Jigawa' } })
  ok('vendor changes their state', r.data?.state === 'Jigawa' && (await req('GET', '/vendors', { query: { state: 'Jigawa' } })).data.some((v) => v.slug === 'bite-box-kano'))
  await req('PATCH', '/me/vendor', { token: owner.token, body: { state: 'Kano' } })
  ok('vendor adds Instagram as the main button', r.data?.instagram === 'biteboxkano' && r.data.primaryContact === 'instagram' && r.data.whatsapp === '2348090005521')
  ok('can’t turn off the main button', (await req('PATCH', '/me/vendor', { token: owner.token, body: { instagram: null } })).status === 400)
  r = await req('GET', '/vendors/bite-box-kano')
  ok('shoppers see the new contact buttons', r.data.instagram === 'biteboxkano' && r.data.primaryContact === 'instagram' && r.data.about === 'Fresh small chops daily.')
  const shopImg = (await req('POST', '/uploads', { token: owner.token, body: { kind: 'shop', dataUrl: PNG } })).data
  ok('shop photo upload is public', shopImg.key?.startsWith('shop/') && !!shopImg.url)
  ok('can’t use someone else’s shop photo', (await req('PATCH', '/me/vendor', { token: owner.token, body: { coverImageKey: (await req('POST', '/uploads', { token: other.token, body: { kind: 'shop', dataUrl: PNG } })).data.key } })).status === 400)
  r = await req('PATCH', '/me/vendor', { token: owner.token, body: { coverImageKey: shopImg.key, logoImageKey: shopImg.key } })
  ok('vendor sets cover photo and logo', !!r.data?.coverImage && !!r.data.logo)
  r = await req('PATCH', '/me/vendor', { token: owner.token, body: { logoImageKey: null } })
  ok('vendor removes the logo', !r.data?.logo && !!r.data.coverImage)
  ok('shoppers can’t upload shop photos', (await req('POST', '/uploads', { token: emailUser.token, body: { kind: 'shop', dataUrl: PNG } })).status === 403)
  ok('Instagram tap counted', (await req('POST', '/vendors/bite-box-kano/events', { body: { event: 'instagram' } })).status === 204
    && (await req('GET', '/me/vendor/stats', { token: owner.token })).data.daily.at(-1).instagram >= 1)

  // Products
  r = await req('POST', '/me/products', { token: owner.token, body: { name: 'Meat pie box', price: 1000, description: 'Fresh', options: [{ label: '6 pcs', price: 4500 }, { label: '12 pcs', price: 8500 }] } })
  ok('product with options; price is the cheapest', r.status === 201 && r.data.options.length === 2 && r.data.price === 4500)
  const pieId = r.data.id
  r = await req('PATCH', `/me/products/${pieId}`, { token: owner.token, body: { name: 'Meat pie box (fresh)', options: [], price: 5000, description: 'Baked every morning' } })
  ok('edit product: name, price, drop options', r.data?.name === 'Meat pie box (fresh)' && r.data.price === 5000 && !r.data.options && r.data.description === 'Baked every morning')
  ok('can’t edit someone else’s product', (await req('PATCH', '/me/products/p1', { token: owner.token, body: { name: 'Mine now' } })).status === 404)
  ok('delete product', (await req('DELETE', `/me/products/${pieId}`, { token: owner.token })).status === 204
    && !(await req('GET', '/vendors/v7/products')).data.some((p) => p.id === pieId))
  ok('can’t delete someone else’s product', (await req('DELETE', '/me/products/p1', { token: owner.token })).status === 404)
  const crunch = await signIn('08160001190')
  ok('can’t delete a product in a running promotion', (await req('DELETE', `/me/products/${(await req('GET', '/admin/promotions', { token: admin.token })).data.find((x) => x.id === 'promo5').productId}`, { token: crunch.token })).status === 409)
  r = await req('GET', '/vendors/henna-by-rahma')
  ok('demo: Instagram-first business', r.data.primaryContact === 'instagram' && r.data.whatsapp === null && r.data.instagram === 'hennabyrahma')

  // Promotions
  const KANO = { lat: 11.9965, lng: 8.531 }
  const LAGOS = { lat: 6.5244, lng: 3.3792 }
  const startDay = todayLagos()
  r = await req('GET', '/promoted', { query: { placement: 'home', ...KANO } })
  ok('home promotions: featured, banners and a product', r.status === 200 && r.data.featured.length >= 2 && r.data.banners.length >= 2 && r.data.products.length === 1,
    `${r.data?.featured?.length}/${r.data?.banners?.length}/${r.data?.products?.length}`)
  ok('waiting request not shown', !r.data.featured.some((v) => v.slug === 'suya-spot-by-musa'))
  ok('sponsored cards carry distance and promotion id', r.data.featured.every((v) => typeof v.distanceKm === 'number' && v.promotionId))
  ok('ended promotion not shown', !r.data.banners.some((b) => b.promotionId === 'promo7'))
  ok('house banner links in-app', r.data.banners.some((b) => b.sponsor === 'Kusa' && b.link === '/vendor/signup' && !b.external))
  r = await req('GET', '/promoted', { query: { placement: 'home', ...LAGOS } })
  ok('city targeting: Kano-only promotions not shown in Lagos', r.data.featured.every((v) => v.slug === 'sweet-crumbs-bakery') && r.data.banners.every((b) => b.sponsor === 'Kusa') && r.data.products.length === 0,
    r.data.featured.map((v) => v.slug).join(','))
  r = await req('GET', '/promoted', { query: { placement: 'home' } })
  ok('browse anywhere sees every city', r.data.featured.length >= 2)
  r = await req('GET', '/promoted', { query: { placement: 'search', category: 'cakes', ...KANO } })
  ok('sponsored results follow search filters', r.data.featured.length > 0 && r.data.featured.every((v) => v.category === 'cakes'))
  r = await req('GET', '/promoted', { query: { placement: 'search', minRating: 5, ...KANO } })
  ok('sponsored results respect the rating filter', r.data.featured.every((v) => v.rating.average >= 5))
  r = await req('GET', '/promotions/plans')
  ok('plans and prices', r.data.plans.length === 3 && r.data.plans.every((p) => p.prices.length > 0) && r.data.cities.includes('Kano'))

  const featuredBody = { kind: 'featured', city: 'Kano', category: null, durationDays: 7, startDate: startDay, paymentRef: 'TRF/TEST/1' }
  ok('duration must be a plan', (await req('POST', '/me/promotions', { token: owner.token, body: { ...featuredBody, durationDays: 10 } })).status === 400)
  ok('start date can’t be past', (await req('POST', '/me/promotions', { token: owner.token, body: { ...featuredBody, startDate: '2020-01-01' } })).status === 400)
  ok('can’t promote someone else’s product', (await req('POST', '/me/promotions', { token: owner.token, body: { ...featuredBody, kind: 'product', productId: 'p1' } })).status === 400)
  ok('banner needs a headline', (await req('POST', '/me/promotions', { token: owner.token, body: { ...featuredBody, kind: 'banner' } })).status === 400)
  ok('shoppers can’t promote', (await req('POST', '/me/promotions', { token: (await signIn('08130000954')).token, body: featuredBody })).status === 403)
  r = await req('POST', '/me/promotions', { token: owner.token, body: featuredBody })
  ok('vendor requests a featured spot', r.status === 201 && r.data.state === 'pending' && r.data.price === 5000, `${r.status} ${r.data?.message ?? ''}`)
  const reqId = r.data.id
  ok('vendor sees the request', (await req('GET', '/me/promotions', { token: owner.token })).data.some((x) => x.id === reqId))
  r = await req('GET', '/admin/promotions', { token: admin.token })
  ok('admin sees requests', r.data.some((x) => x.id === reqId && !x.byAdmin) && r.data.some((x) => x.id === 'promo6' && x.state === 'pending'))
  ok('rejecting needs a note', (await req('PATCH', `/admin/promotions/${reqId}`, { token: admin.token, body: { action: 'reject' } })).status === 400)
  r = await req('PATCH', `/admin/promotions/${reqId}`, { token: admin.token, body: { action: 'approve' } })
  const days = r.data ? (Date.parse(r.data.endsAt) - Date.parse(r.data.startsAt)) / 86400000 : 0
  ok('approve starts it now for 7 days', r.data?.state === 'running' && Math.abs(days - 7) < 0.001, `${r.data?.state} ${days}`)
  ok('can’t approve twice', (await req('PATCH', `/admin/promotions/${reqId}`, { token: admin.token, body: { action: 'approve' } })).status === 409)
  r = await req('GET', '/promoted', { query: { placement: 'home', ...KANO } })
  ok('approved business appears as sponsored', r.data.featured.some((v) => v.slug === 'bite-box-kano' && v.promotionId === reqId))
  ok('impression counted', (await req('POST', `/promotions/${reqId}/events`, { body: { event: 'impression' } })).status === 204)
  await req('POST', `/promotions/${reqId}/events`, { body: { event: 'click' } })
  await req('POST', '/promotions/promo6/events', { body: { event: 'impression' } })
  r = await req('GET', '/me/promotions', { token: owner.token })
  ok('vendor sees impressions and clicks', r.data.find((x) => x.id === reqId)?.impressions === 1 && r.data.find((x) => x.id === reqId)?.clicks === 1)
  ok('waiting promotions don’t count impressions', (await req('GET', '/admin/promotions', { token: admin.token })).data.find((x) => x.id === 'promo6')?.impressions === 0)
  ok('ad traffic source accepted', (await req('POST', '/vendors/bite-box-kano/events', { body: { event: 'view', source: 'ad', firstVisitToday: false } })).status === 204)
  r = await req('PATCH', `/admin/promotions/${reqId}`, { token: admin.token, body: { action: 'end' } })
  ok('admin ends it early', r.data?.state === 'ended')
  r = await req('GET', '/promoted', { query: { placement: 'home', ...KANO } })
  ok('ended promotion stops showing', !r.data.featured.some((v) => v.slug === 'bite-box-kano'))

  r = await req('POST', '/me/promotions', { token: owner.token, body: { ...featuredBody, kind: 'product', productId: (await req('GET', '/vendors/v7/products')).data[0].id } })
  ok('vendor requests a promoted product', r.status === 201 && r.data.productName)
  ok('vendor cancels a waiting request', (await req('PATCH', `/me/promotions/${r.data.id}`, { token: owner.token, body: { action: 'cancel' } })).data?.state === 'cancelled')
  ok('can’t cancel twice', (await req('PATCH', `/me/promotions/${r.data.id}`, { token: owner.token, body: { action: 'cancel' } })).status === 404)
  const banner = (await req('POST', '/uploads', { token: owner.token, body: { kind: 'banner', dataUrl: PNG } })).data
  ok('banner image is public', banner.key?.startsWith('banner/') && (await fetch(B.replace('/api', '') + banner.url)).status === 200)
  ok('shoppers can’t upload banners', (await req('POST', '/uploads', { token: (await signIn('08020007719')).token, body: { kind: 'banner', dataUrl: PNG } })).status === 403)
  const adminImg = (await req('POST', '/uploads', { token: admin.token, body: { kind: 'banner', dataUrl: PNG } })).data
  ok('can’t use someone else’s banner image', (await req('POST', '/me/promotions', { token: owner.token, body: { ...featuredBody, kind: 'banner', headline: 'Hot small chops', imageKey: adminImg.key } })).status === 400)
  r = await req('POST', '/me/promotions', { token: owner.token, body: { ...featuredBody, kind: 'banner', headline: 'Hot small chops', imageKey: banner.key, durationDays: 14 } })
  ok('vendor requests a banner with an image', r.status === 201 && r.data.imageUrl && r.data.price === 18000)

  const house = { kind: 'banner', headline: 'Cake week on Kusa', linkUrl: 'https://example.com/cake-week', city: null, category: 'cakes', durationDays: 3, startDate: startDay, price: 0 }
  ok('house banner link must be safe', (await req('POST', '/admin/promotions', { token: admin.token, body: { ...house, linkUrl: 'javascript:alert(1)' } })).status === 400)
  r = await req('POST', '/admin/promotions', { token: admin.token, body: house })
  ok('admin creates a house banner', r.status === 201 && r.data.state === 'running' && r.data.byAdmin)
  const houseId = r.data.id
  r = await req('GET', '/promoted', { query: { placement: 'home', ...KANO } })
  ok('category banner hidden on home', !r.data.banners.some((b) => b.promotionId === houseId))
  let seen = false
  for (let i = 0; i < 12 && !seen; i++) seen = (await req('GET', '/promoted', { query: { placement: 'search', category: 'cakes', ...KANO } })).data.banners.some((b) => b.promotionId === houseId && b.external)
  ok('category banner shown when browsing that category', seen)
  ok('admin needs a business for a featured spot', (await req('POST', '/admin/promotions', { token: admin.token, body: { ...house, kind: 'featured', linkUrl: undefined } })).status === 400)
  ok('shopper can’t use admin promotions', (await req('GET', '/admin/promotions', { token: owner.token })).status === 403)

  // CORS for the native apps
  const pre = await fetch(B + '/vendors', { method: 'OPTIONS', headers: { origin: 'capacitor://localhost', 'access-control-request-method': 'GET', 'access-control-request-headers': 'authorization' } })
  ok('CORS preflight for app', pre.headers.get('access-control-allow-origin') === 'capacitor://localhost', `${pre.status}`)
  const bad = await fetch(B + '/vendors', { headers: { origin: 'https://evil.example' } })
  ok('CORS blocks other sites', !bad.headers.get('access-control-allow-origin'))
} catch (e) {
  if (e.message !== 'done') results.push('ERROR ' + e.stack)
}
console.log(results.join('\n'))
console.log(`\n${results.filter((x) => x.startsWith('PASS')).length}/${results.length} passed`)
process.exitCode = results.every((r) => r.startsWith('PASS')) ? 0 : 1
