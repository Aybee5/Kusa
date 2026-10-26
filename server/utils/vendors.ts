import { and, eq, gte, ilike, inArray, lte, ne, or, sql, type SQL } from 'drizzle-orm'
import type { CategoryId, Product, RatingSummary, SearchFilters, Vendor, VendorWithMeta } from '#shared/types'
import type { LatLng } from '#shared/types/api'
import { CATEGORIES, DEFAULT_LOCATION, emptyRating, haversineKm, initialsOf, openStateFor } from '#shared/utils/catalog'
import type { ProductRow, VendorRow } from '../database/schema'

const isoDate = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : undefined)

export function toVendor(v: VendorRow, ownerName = ''): Vendor {
  return {
    id: v.id,
    slug: v.slug,
    name: v.name,
    ownerName,
    phone: v.phone,
    whatsapp: v.whatsapp,
    category: v.category as CategoryId,
    area: v.area,
    city: v.city,
    landmark: v.landmark ?? undefined,
    lat: v.lat,
    lng: v.lng,
    status: v.status,
    suspensionReason: v.suspensionReason ?? undefined,
    reviewNote: v.reviewNote ?? undefined,
    hours: { opens: v.opens, closes: v.closes, closedDays: v.closedDays },
    delivery: v.delivery,
    pickup: v.pickup,
    about: v.about,
    initials: initialsOf(v.name),
    tint: v.tint,
    coverTint: v.coverTint,
    joinedAt: isoDate(v.createdAt)!,
    submittedAt: isoDate(v.submittedAt),
    documents: { idType: v.idType ?? '', hasSelfie: !!v.selfieKey, hasBusinessProof: !!v.proofKey },
  }
}

export function toProduct(p: ProductRow): Product {
  return {
    id: p.id,
    vendorId: p.vendorId,
    name: p.name,
    price: p.price,
    options: p.options ?? undefined,
    description: p.description,
    tags: p.tags,
    tint: p.tint,
    photoLabel: p.photoLabel || p.name,
    image: publicFileUrl(p.imageKey),
    available: p.available,
    createdAt: isoDate(p.createdAt)!,
  }
}

/** Ratings that count publicly: published reviews by accounts that aren't suspended. */
export async function ratingSummaries(vendorIds: string[]): Promise<Map<string, RatingSummary>> {
  const out = new Map<string, RatingSummary>()
  if (!vendorIds.length) return out
  const { reviews, users } = schema
  const rows = await useDb()
    .select({ vendorId: reviews.vendorId, stars: reviews.stars, n: sql<number>`count(*)::int` })
    .from(reviews)
    .innerJoin(users, eq(users.id, reviews.userId))
    .where(and(inArray(reviews.vendorId, vendorIds), eq(reviews.status, 'published'), ne(users.status, 'suspended')))
    .groupBy(reviews.vendorId, reviews.stars)
  for (const r of rows) {
    const s = out.get(r.vendorId) ?? emptyRating()
    s.breakdown[5 - r.stars] = r.n
    out.set(r.vendorId, s)
  }
  for (const s of out.values()) {
    s.count = s.breakdown.reduce((a, b) => a + b, 0)
    const total = s.breakdown.reduce((sum, n, i) => sum + n * (5 - i), 0)
    s.average = s.count ? Math.round((total / s.count) * 10) / 10 : 0
  }
  return out
}

async function productSummaries(vendorIds: string[]) {
  const out = new Map<string, { count: number; fromPrice: number | null }>()
  if (!vendorIds.length) return out
  const rows = await useDb()
    .select({ vendorId: schema.products.vendorId, price: schema.products.price, options: schema.products.options })
    .from(schema.products)
    .where(inArray(schema.products.vendorId, vendorIds))
  for (const r of rows) {
    const s = out.get(r.vendorId) ?? { count: 0, fromPrice: null }
    const prices = r.options?.length ? r.options.map((o) => o.price) : [r.price]
    s.count++
    s.fromPrice = Math.min(s.fromPrice ?? Infinity, ...prices)
    out.set(r.vendorId, s)
  }
  return out
}

export async function withMeta(rows: VendorRow[], origin: LatLng): Promise<VendorWithMeta[]> {
  const ids = rows.map((r) => r.id)
  const [ratings, prods, owners] = await Promise.all([
    ratingSummaries(ids),
    productSummaries(ids),
    ids.length
      ? useDb().select({ id: schema.users.id, name: schema.users.name }).from(schema.users).where(inArray(schema.users.id, rows.map((r) => r.ownerId)))
      : Promise.resolve([]),
  ])
  const ownerName = new Map(owners.map((o) => [o.id, o.name]))
  return rows.map((r) => ({
    ...toVendor(r, ownerName.get(r.ownerId)),
    rating: ratings.get(r.id) ?? emptyRating(),
    distanceKm: haversineKm(origin, r),
    openState: openStateFor({ opens: r.opens, closes: r.closes, closedDays: r.closedDays }),
    productCount: prods.get(r.id)?.count ?? 0,
    fromPrice: prods.get(r.id)?.fromPrice ?? null,
  }))
}

/** Find a public (verified) business by slug or id. */
export async function findPublicVendor(key: string): Promise<VendorRow | null> {
  const { vendors } = schema
  const [v] = await useDb().select().from(vendors)
    .where(and(eq(vendors.status, 'verified'), or(eq(vendors.slug, key), eq(vendors.id, key))))
    .limit(1)
  return v ?? null
}

export async function searchVendors(f: SearchFilters, origin: LatLng): Promise<VendorWithMeta[]> {
  const { vendors, products } = schema
  const where: SQL[] = [eq(vendors.status, 'verified')]
  if (f.category) where.push(eq(vendors.category, f.category))
  if (f.delivery) where.push(eq(vendors.delivery, true))
  if (f.pickup) where.push(eq(vendors.pickup, true))
  if (f.radiusKm) {
    // Cheap bounding box first (indexed), exact distance below.
    const dLat = f.radiusKm / 111
    const dLng = f.radiusKm / (111 * Math.cos((origin.lat * Math.PI) / 180))
    where.push(gte(vendors.lat, origin.lat - dLat), lte(vendors.lat, origin.lat + dLat), gte(vendors.lng, origin.lng - dLng), lte(vendors.lng, origin.lng + dLng))
  }
  const q = f.q.trim()
  if (q) {
    const like = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`
    const catIds = CATEGORIES.filter((c) => c.label.toLowerCase().includes(q.toLowerCase())).map((c) => c.id)
    where.push(or(
      ilike(vendors.name, like),
      ilike(vendors.area, like),
      ...(catIds.length ? [inArray(vendors.category, catIds)] : []),
      sql`exists (select 1 from ${products} p where p.vendor_id = ${vendors.id} and (p.name ilike ${like} or p.description ilike ${like}))`,
    )!)
  }
  const rows = await useDb().select().from(vendors).where(and(...where)).limit(500)
  let list = await withMeta(rows, origin)
  list = list
    .filter((v) => !f.radiusKm || v.distanceKm <= f.radiusKm)
    .filter((v) => !f.minRating || v.rating.average >= f.minRating)
    .filter((v) => !f.openNow || v.openState.open)
  return list.sort((a, b) =>
    f.sort === 'top-rated' ? b.rating.average - a.rating.average || b.rating.count - a.rating.count || a.distanceKm - b.distanceKm : a.distanceKm - b.distanceKm,
  ).slice(0, 100)
}

/** Origin from ?lat=&lng= query params, falling back to central Kano. */
export function originFrom(query: Record<string, unknown>): LatLng {
  const lat = Number(query.lat)
  const lng = Number(query.lng)
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : { lat: DEFAULT_LOCATION.lat, lng: DEFAULT_LOCATION.lng }
}
