import { and, desc, eq, gte, ilike, inArray, or, sql, type SQL } from 'drizzle-orm'
import type { CategoryId, Product, RatingSummary, SearchFilters, Vendor, VendorWithMeta } from '#shared/types'
import type { LatLng } from '#shared/types/api'
import { CATEGORIES, haversineKm, initialsOf, lagosNow, openStateFor } from '#shared/utils/catalog'
import type { AnyPgColumn } from 'drizzle-orm/pg-core'
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
    instagram: v.instagram,
    showPhone: v.showPhone,
    primaryContact: v.primaryContact,
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
    coverImage: publicFileUrl(v.coverImageKey),
    logo: publicFileUrl(v.logoImageKey),
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

/** The stored rating (kept current by database triggers; see migration 0001). */
export function ratingOf(v: VendorRow): RatingSummary {
  return { average: v.ratingAvg, count: v.ratingCount, breakdown: [...v.ratingBreakdown] as RatingSummary['breakdown'] }
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

export async function withMeta(rows: VendorRow[], origin: LatLng | null): Promise<VendorWithMeta[]> {
  const ids = rows.map((r) => r.id)
  const [prods, owners] = await Promise.all([
    productSummaries(ids),
    ids.length
      ? useDb().select({ id: schema.users.id, name: schema.users.name }).from(schema.users).where(inArray(schema.users.id, rows.map((r) => r.ownerId)))
      : Promise.resolve([]),
  ])
  const ownerName = new Map(owners.map((o) => [o.id, o.name]))
  return rows.map((r) => ({
    ...toVendor(r, ownerName.get(r.ownerId)),
    rating: ratingOf(r),
    distanceKm: origin ? haversineKm(origin, r) : null,
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

export const SEARCH_LIMIT = 100

/**
 * Search verified businesses. Every filter and the sort run in the database,
 * so the result limit always keeps the right businesses however many match.
 * With an origin, results can be limited to a radius and sorted nearest first;
 * without one ("browse anywhere") there's no distance and "nearest" falls back
 * to top rated.
 */
export async function searchVendors(
  f: SearchFilters,
  origin: LatLng | null,
  opts: { now?: { day: number; minutes: number }; ids?: string[] } = {},
): Promise<VendorWithMeta[]> {
  const { vendors, products } = schema
  const now = opts.now ?? lagosNow()
  const where: SQL[] = [eq(vendors.status, 'verified')]
  if (opts.ids) where.push(opts.ids.length ? inArray(vendors.id, opts.ids) : sql`false`)
  if (f.category) where.push(eq(vendors.category, f.category))
  if (f.delivery) where.push(eq(vendors.delivery, true))
  if (f.pickup) where.push(eq(vendors.pickup, true))
  if (f.minRating) where.push(gte(vendors.ratingAvg, f.minRating))
  if (f.openNow) where.push(openAt(now))
  if (origin && f.radiusKm) where.push(...withinRadius(origin, f.radiusKm))
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
  const nearest = origin ? nearestFirst(origin) : null
  const topRated = [desc(vendors.ratingAvg), desc(vendors.ratingCount)]
  const order = f.sort === 'nearest' && nearest
    ? [nearest, vendors.id]
    : [...topRated, ...(nearest ? [nearest] : []), vendors.id]
  const rows = await useDb().select().from(vendors).where(and(...where)).orderBy(...order).limit(SEARCH_LIMIT)
  return withMeta(rows, origin)
}

/** Open at a Lagos day and time, by the same rule as openStateFor(). */
function openAt(now: { day: number; minutes: number }): SQL {
  const { vendors } = schema
  const min = (col: AnyPgColumn) => sql`(split_part(${col}, ':', 1)::int * 60 + split_part(${col}, ':', 2)::int)`
  return sql`not (${vendors.closedDays} @> ${JSON.stringify([now.day])}::jsonb)
    and ${min(vendors.opens)} <= ${now.minutes} and ${now.minutes} < ${min(vendors.closes)}`
}

/** Origin from ?lat=&lng= query params, or null to browse without distances. */
export function originFrom(query: Record<string, unknown>): LatLng | null {
  if (query.lat == null || query.lng == null || query.lat === '' || query.lng === '') return null
  const lat = Number(query.lat)
  const lng = Number(query.lng)
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null
}
