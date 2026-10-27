// Loads the demo data into an empty database. Relative imports only, so it
// runs both inside the server and from `npm run db:seed`.
import { sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import * as schema from './schema'
import { buildAllStats, products, reviews, seedRatings, shoppers, vendors } from './demo-data'
import { todayLagos } from '../../shared/utils/catalog'

const {
  users, vendors: vendorsT, products: productsT, reviews: reviewsT, vendorDailyStats, vendorSourceStats, productDailyViews,
  promotions: promotionsT, promotionDailyStats,
} = schema

/** Demo admin. Sign in with this number or email; in development the code is shown on screen. */
export const DEMO_ADMIN_PHONE = '+2348000000001'
export const DEMO_ADMIN_EMAIL = 'admin@demo.kusa.ng'
const demoEmail = (local: string) => `${local.toLowerCase().replace(/[^a-z0-9.-]+/g, '')}@demo.kusa.ng`

// Some demo businesses take messages on Instagram.
const CONTACTS: Record<string, { instagram?: string; whatsapp?: null; primaryContact?: 'instagram' | 'phone' }> = {
  v9: { instagram: 'kanokicks' },
  v11: { instagram: 'amaljewels.kano', primaryContact: 'instagram' },
  v14: { instagram: 'hennabyrahma', whatsapp: null, primaryContact: 'instagram' },
}

const RATER_NAMES = [
  'Abubakar Sani', 'Amina Bello', 'Chinedu Okafor', 'Fatima Yusuf', 'Halima Aliyu', 'Ibrahim Musa', 'Jamila Ahmed', 'Kabir Lawal',
  'Lami Danjuma', 'Maryam Idris', 'Nasiru Garba', 'Ngozi Eze', 'Rabi Umar', 'Sadiq Bashir', 'Tunde Adebayo', 'Usman Haruna',
  'Zainab Abdullahi', 'Aliyu Shehu', 'Bilkisu Isa', 'Emeka Nwosu', 'Hauwa Salisu', 'Ikechukwu Obi', 'Khadija Sule', 'Mustapha Kabir',
  'Nafisa Hassan', 'Obinna Chukwu', 'Rukayya Ado', 'Sani Mohammed', 'Talatu Bala', 'Yakubu Ibrahim', 'Zuwaira Tanko', 'Adamu Hamza',
  'Binta Mahmud', 'Danladi Audu', 'Esther John', 'Gambo Yahaya', 'Hadiza Saidu', 'Idris Jibril', 'Kubra Shuaibu', 'Murtala Nuhu',
]
const TINTS = ['#E3F1EA', '#E4E1F2', '#FBE7D9', '#F4ECC4', '#EFE0EC', '#D9EBE6', '#F1D3DA']

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000)
const productNamed = (vendorId: string, name: string) => products.find((p) => p.vendorId === vendorId && p.name.startsWith(name))!.id
const asDate = (iso: string) => new Date(`${iso}T10:00:00+01:00`)

export async function seedDemoData(db: NodePgDatabase<typeof schema>, log = console.log): Promise<boolean> {
  const [{ count }] = (await db.execute<{ count: number }>(sql`SELECT count(*)::int AS count FROM users`)).rows as [{ count: number }]
  if (count > 0) return false

  await db.transaction(async (tx) => {
    // Admin, shoppers, raters and vendor owners
    await tx.insert(users).values({ id: 'admin', phone: DEMO_ADMIN_PHONE, email: DEMO_ADMIN_EMAIL, name: 'Kusa Admin', role: 'admin' })
    await tx.insert(users).values(shoppers.map((s) => ({
      id: s.id, phone: s.phone, email: demoEmail(s.name.split(' ')[0]!), name: s.name, role: 'shopper' as const, status: s.status, suspensionReason: s.suspensionReason,
      area: s.area, tint: s.tint, createdAt: asDate(s.joinedAt), lastActiveAt: asDate(s.lastActiveAt),
    })))
    await tx.insert(users).values(RATER_NAMES.map((name, i) => ({
      id: `rater${i + 1}`, email: demoEmail(`rater${i + 1}`), phone: `+2349${String(10000000 + i * 7919).padStart(9, '0')}`.slice(0, 14), name, role: 'shopper' as const,
      area: 'Kano', tint: TINTS[i % TINTS.length]!, createdAt: daysAgo(40 + i * 2), lastActiveAt: daysAgo(i % 9),
    })))
    await tx.insert(users).values(vendors.map((v) => ({
      id: `owner-${v.id}`, phone: v.phone, email: demoEmail(v.slug), name: v.ownerName, role: 'vendor' as const, area: v.area, createdAt: asDate(v.joinedAt),
    })))

    await tx.insert(vendorsT).values(vendors.map((v) => ({
      id: v.id, ownerId: `owner-${v.id}`, slug: v.slug, name: v.name, category: v.category, phone: v.phone, whatsapp: v.whatsapp,
      ...CONTACTS[v.id],
      area: v.area, city: v.city, landmark: v.landmark, lat: v.lat, lng: v.lng, status: v.status, suspensionReason: v.suspensionReason,
      opens: v.hours.opens, closes: v.hours.closes, closedDays: v.hours.closedDays, delivery: v.delivery, pickup: v.pickup,
      about: v.about, tint: v.tint, coverTint: v.coverTint, idType: v.documents.idType || null,
      createdAt: asDate(v.joinedAt), submittedAt: v.submittedAt ? asDate(v.submittedAt) : asDate(v.joinedAt),
      verifiedAt: v.status === 'verified' ? asDate(v.joinedAt) : null,
    })))

    await tx.insert(productsT).values(products.map((p) => ({
      id: p.id, vendorId: p.vendorId, name: p.name, price: p.price, options: p.options ?? null, description: p.description,
      tags: p.tags, tint: p.tint, photoLabel: p.photoLabel, available: p.available, createdAt: asDate(p.createdAt),
    })))

    // Written reviews
    await tx.insert(reviewsT).values(reviews.map((r) => ({
      id: r.id, vendorId: r.vendorId, userId: r.shopperId, stars: r.stars, tags: r.tags, text: r.text, status: r.status,
      flagReason: r.flagReason, createdAt: asDate(r.createdAt), updatedAt: asDate(r.createdAt),
    })))

    // Star-only ratings from the raters, shaped like each vendor's history
    const written = new Set(reviews.map((r) => r.vendorId))
    const starRows: (typeof reviewsT.$inferInsert)[] = []
    for (const [vendorId, breakdown] of Object.entries(seedRatings)) {
      const total = breakdown.reduce((a, b) => a + b, 0)
      const scale = Math.min(1, RATER_NAMES.length / total)
      let rater = 0
      breakdown.forEach((n, i) => {
        const stars = 5 - i
        for (let k = 0; k < Math.round(n * scale) && rater < RATER_NAMES.length; k++) {
          starRows.push({ vendorId, userId: `rater${++rater}`, stars, createdAt: daysAgo(3 + ((rater * 11) % 80)) })
        }
      })
    }
    if (starRows.length) await tx.insert(reviewsT).values(starRows)

    // Traffic for the last 60 days
    const stats = buildAllStats(todayLagos()).filter((s) => vendors.find((v) => v.id === s.vendorId)?.status !== 'pending')
    for (const s of stats) {
      await tx.insert(vendorDailyStats).values(s.daily.map((d) => ({ vendorId: s.vendorId, day: d.date, ...pick(d, CONTACTS[s.vendorId]) })))
      await tx.insert(vendorSourceStats).values(s.daily.flatMap((d) => [
        { vendorId: s.vendorId, day: d.date, source: 'search', views: Math.round(d.views * 0.46) },
        { vendorId: s.vendorId, day: d.date, source: 'map', views: Math.round(d.views * 0.24) },
        { vendorId: s.vendorId, day: d.date, source: 'share', views: Math.round(d.views * 0.21) },
        { vendorId: s.vendorId, day: d.date, source: 'external', views: Math.round(d.views * 0.09) },
      ]))
      const last30 = s.daily.slice(-30)
      const productRows = Object.entries(s.productViews).flatMap(([productId, total]) =>
        last30.map((d, i) => ({ productId, day: d.date, views: Math.round((total / 30) * (0.6 + ((i * 7) % 9) / 10)) })),
      )
      if (productRows.length) await tx.insert(productDailyViews).values(productRows)
    }

    // Promotions: running, scheduled-to-approve, a house banner and an ended one
    type Promo = typeof promotionsT.$inferInsert
    const promo = (o: Omit<Promo, 'endsAt' | 'createdAt' | 'decidedAt'> & { startsAt: Date }): Promo => ({
      ...o,
      endsAt: new Date(o.startsAt.getTime() + o.durationDays * 86400000),
      createdAt: new Date(o.startsAt.getTime() - 86400000),
      decidedAt: o.status === 'pending' ? null : o.startsAt,
    })
    const promos: Promo[] = [
      promo({ id: 'promo1', kind: 'featured', vendorId: 'v1', city: 'Kano', category: null, durationDays: 14, price: 9000, startsAt: daysAgo(3), status: 'approved', paymentRef: 'TRF/HADIZA/1022', createdBy: 'owner-v1' }),
      promo({ id: 'promo2', kind: 'featured', vendorId: 'v12', city: null, category: null, durationDays: 30, price: 16000, startsAt: daysAgo(10), status: 'approved', paymentRef: 'Maryam Aliyu (GTB)', createdBy: 'owner-v12' }),
      promo({ id: 'promo3', kind: 'banner', vendorId: 'v11', headline: 'Handmade waist beads, made to order', city: 'Kano', category: null, durationDays: 7, price: 10000, startsAt: daysAgo(2), status: 'approved', paymentRef: 'TRF/AMAL/0919', createdBy: 'owner-v11' }),
      promo({ id: 'promo4', kind: 'banner', vendorId: null, headline: 'Sell from home? List your business on Kusa', linkUrl: '/vendor/signup', city: null, category: null, durationDays: 30, price: 0, startsAt: daysAgo(5), status: 'approved', createdBy: 'admin' }),
      promo({ id: 'promo5', kind: 'product', vendorId: 'v4', productId: productNamed('v4', 'Chin chin'), city: 'Kano', category: null, durationDays: 7, price: 3000, startsAt: daysAgo(1), status: 'approved', paymentRef: 'TRF/NGOZI/3310', createdBy: 'owner-v4' }),
      promo({ id: 'promo6', kind: 'featured', vendorId: 'v3', city: 'Kano', category: null, durationDays: 7, price: 5000, startsAt: new Date(`${todayLagos()}T00:00:00+01:00`), status: 'pending', paymentRef: 'TRF/2210/MUSA', createdBy: 'owner-v3' }),
      promo({ id: 'promo7', kind: 'banner', vendorId: 'v1', productId: productNamed('v1', 'Small chops party pack'), headline: 'Party packs for naming ceremonies', city: 'Kano', category: null, durationDays: 7, price: 10000, startsAt: daysAgo(40), status: 'approved', paymentRef: 'TRF/HADIZA/0915', createdBy: 'owner-v1' }),
    ]
    await tx.insert(promotionsT).values(promos)
    const promoStats = promos.filter((x) => x.status === 'approved').flatMap((x, n) => {
      const days = Math.min(x.durationDays, Math.ceil((Date.now() - x.startsAt.getTime()) / 86400000))
      return Array.from({ length: days }, (_, i) => {
        const impressions = 140 + ((i * 37 + n * 53) % 160)
        return { promotionId: x.id!, day: todayLagos(new Date(x.startsAt.getTime() + i * 86400000)), impressions, clicks: Math.round(impressions * (0.025 + ((i + n) % 4) / 100)) }
      })
    })
    if (promoStats.length) await tx.insert(promotionDailyStats).values(promoStats)
  })
  log('[db] loaded demo data')
  return true
}

function pick(d: { views: number; visitors: number; whatsapp: number; calls: number; directions: number }, contacts?: (typeof CONTACTS)[string]) {
  // Businesses on Instagram get some of their message taps there instead.
  const instagram = contacts?.instagram ? Math.round(d.whatsapp * (contacts.whatsapp === null ? 1 : 0.5)) : 0
  return { views: d.views, visitors: d.visitors, whatsapp: d.whatsapp - instagram, instagram, calls: d.calls, directions: d.directions }
}
