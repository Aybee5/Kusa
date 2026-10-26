// Loads the demo data into an empty database. Relative imports only, so it
// runs both inside the server and from `npm run db:seed`.
import { sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import * as schema from './schema'
import { buildAllStats, products, reviews, seedRatings, shoppers, vendors } from './demo-data'
import { todayLagos } from '../../shared/utils/catalog'

const { users, vendors: vendorsT, products: productsT, reviews: reviewsT, vendorDailyStats, vendorSourceStats, productDailyViews } = schema

/** Demo admin. Sign in with this number; in development the code is shown on screen. */
export const DEMO_ADMIN_PHONE = '+2348000000001'

const RATER_NAMES = [
  'Abubakar Sani', 'Amina Bello', 'Chinedu Okafor', 'Fatima Yusuf', 'Halima Aliyu', 'Ibrahim Musa', 'Jamila Ahmed', 'Kabir Lawal',
  'Lami Danjuma', 'Maryam Idris', 'Nasiru Garba', 'Ngozi Eze', 'Rabi Umar', 'Sadiq Bashir', 'Tunde Adebayo', 'Usman Haruna',
  'Zainab Abdullahi', 'Aliyu Shehu', 'Bilkisu Isa', 'Emeka Nwosu', 'Hauwa Salisu', 'Ikechukwu Obi', 'Khadija Sule', 'Mustapha Kabir',
  'Nafisa Hassan', 'Obinna Chukwu', 'Rukayya Ado', 'Sani Mohammed', 'Talatu Bala', 'Yakubu Ibrahim', 'Zuwaira Tanko', 'Adamu Hamza',
  'Binta Mahmud', 'Danladi Audu', 'Esther John', 'Gambo Yahaya', 'Hadiza Saidu', 'Idris Jibril', 'Kubra Shuaibu', 'Murtala Nuhu',
]
const TINTS = ['#E3F1EA', '#E4E1F2', '#FBE7D9', '#F4ECC4', '#EFE0EC', '#D9EBE6', '#F1D3DA']

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000)
const asDate = (iso: string) => new Date(`${iso}T10:00:00+01:00`)

export async function seedDemoData(db: NodePgDatabase<typeof schema>, log = console.log): Promise<boolean> {
  const [{ count }] = (await db.execute<{ count: number }>(sql`SELECT count(*)::int AS count FROM users`)).rows as [{ count: number }]
  if (count > 0) return false

  await db.transaction(async (tx) => {
    // Admin, shoppers, raters and vendor owners
    await tx.insert(users).values({ id: 'admin', phone: DEMO_ADMIN_PHONE, name: 'Kusa Admin', role: 'admin' })
    await tx.insert(users).values(shoppers.map((s) => ({
      id: s.id, phone: s.phone, name: s.name, role: 'shopper' as const, status: s.status, suspensionReason: s.suspensionReason,
      area: s.area, tint: s.tint, createdAt: asDate(s.joinedAt), lastActiveAt: asDate(s.lastActiveAt),
    })))
    await tx.insert(users).values(RATER_NAMES.map((name, i) => ({
      id: `rater${i + 1}`, phone: `+2349${String(10000000 + i * 7919).padStart(9, '0')}`.slice(0, 14), name, role: 'shopper' as const,
      area: 'Kano', tint: TINTS[i % TINTS.length]!, createdAt: daysAgo(40 + i * 2), lastActiveAt: daysAgo(i % 9),
    })))
    await tx.insert(users).values(vendors.map((v) => ({
      id: `owner-${v.id}`, phone: v.phone, name: v.ownerName, role: 'vendor' as const, area: v.area, createdAt: asDate(v.joinedAt),
    })))

    await tx.insert(vendorsT).values(vendors.map((v) => ({
      id: v.id, ownerId: `owner-${v.id}`, slug: v.slug, name: v.name, category: v.category, phone: v.phone, whatsapp: v.whatsapp,
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
      await tx.insert(vendorDailyStats).values(s.daily.map((d) => ({ vendorId: s.vendorId, day: d.date, ...pick(d) })))
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
  })
  log('[db] loaded demo data')
  return true
}

function pick(d: { views: number; visitors: number; whatsapp: number; calls: number; directions: number }) {
  return { views: d.views, visitors: d.visitors, whatsapp: d.whatsapp, calls: d.calls, directions: d.directions }
}
