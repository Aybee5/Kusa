import { and, desc, eq, gt, ilike, inArray, isNull, lte, or, sql, type SQL } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import type { CategoryId, SearchFilters } from '#shared/types'
import type {
  LatLng, Promoted, PromotedBanner, PromotedProduct, PromotedVendor, Promotion, PromotionKind, PromotionPlan, PromotionPlans,
} from '#shared/types/api'
import { haversineKm, todayLagos } from '#shared/utils/catalog'
import { addDays, PROMOTION_LABELS, promotionState } from '#shared/utils/promotions'
import type { PromotionRow } from '../database/schema'

// --- Plans -------------------------------------------------------------------

/** Default prices in naira. Change them with PROMOTION_PRICES without a new app release. */
const DEFAULT_PRICES: Record<PromotionKind, Record<number, number>> = {
  featured: { 7: 5000, 14: 9000, 30: 16000 },
  banner: { 7: 10000, 14: 18000, 30: 32000 },
  product: { 7: 3000, 14: 5500, 30: 10000 },
}
const DESCRIPTIONS: Record<PromotionKind, string> = {
  featured: 'Your business at the top of search results and in the Featured row on the home page, marked Sponsored.',
  banner: 'A banner on the home page and between search results. Use your own image or a simple text banner.',
  product: 'One of your products first in “Just listed” on the home page and at the top of matching searches.',
}

export function promotionPlans(): PromotionPlan[] {
  const overrides = serverConfig().promotionPrices
  return (Object.keys(DEFAULT_PRICES) as PromotionKind[]).map((kind) => {
    const prices: Record<number, number> = { ...DEFAULT_PRICES[kind] }
    for (const [d, price] of Object.entries(overrides[kind] ?? {})) prices[Number(d)] = Number(price)
    return {
      kind,
      label: PROMOTION_LABELS[kind],
      description: DESCRIPTIONS[kind],
      prices: Object.entries(prices).map(([days, price]) => ({ days: Number(days), price: Number(price) })).filter((p) => p.days > 0 && Number.isFinite(p.price) && p.price >= 0).sort((a, b) => a.days - b.days),
    }
  })
}

export const planPrice = (kind: PromotionKind, days: number) => promotionPlans().find((p) => p.kind === kind)?.prices.find((p) => p.days === days)?.price

export async function plansResponse(): Promise<PromotionPlans> {
  return { plans: promotionPlans(), payment: serverConfig().payment, cities: (await cityCentres()).map((c) => c.city) }
}

// --- Dates -------------------------------------------------------------------

/** Start of a Lagos day. */
export const lagosMidnight = (iso: string) => new Date(`${iso}T00:00:00+01:00`)

/** Check a requested start date: today (Lagos) up to 60 days ahead. */
export function assertStartDate(iso: string) {
  const today = todayLagos()
  if (iso < today) throw createError({ statusCode: 400, message: 'Choose a start date from today onwards' })
  if (iso > addDays(today, 60)) throw createError({ statusCode: 400, message: 'Start dates can be up to 60 days ahead' })
}

/** Approval starts the clock: from the requested day, or now if that's already passed. */
export function scheduleFrom(requestedStart: Date, durationDays: number, now = new Date()) {
  const startsAt = requestedStart > now ? requestedStart : now
  return { startsAt, endsAt: new Date(startsAt.getTime() + durationDays * 86400000) }
}

// --- Reading promotions -------------------------------------------------------

/** Promotions with vendor and product names and their impression/click totals. */
export async function listPromotions(where?: SQL): Promise<Promotion[]> {
  const { promotions: p, vendors: v, products: pr, promotionDailyStats: s } = schema
  const db = useDb()
  const creator = alias(schema.users, 'creator')
  const rows = await db.select({ p, vendorName: v.name, vendorSlug: v.slug, productName: pr.name, creatorRole: creator.role })
    .from(p)
    .leftJoin(v, eq(v.id, p.vendorId))
    .leftJoin(pr, eq(pr.id, p.productId))
    .leftJoin(creator, eq(creator.id, p.createdBy))
    .where(where)
    .orderBy(desc(p.createdAt))
  const ids = rows.map((r) => r.p.id)
  const totals = ids.length
    ? await db.select({ id: s.promotionId, impressions: sql<number>`sum(${s.impressions})::int`, clicks: sql<number>`sum(${s.clicks})::int` })
      .from(s).where(inArray(s.promotionId, ids)).groupBy(s.promotionId)
    : []
  const byId = new Map(totals.map((t) => [t.id, t]))
  const now = new Date()
  return rows.map(({ p: row, creatorRole, ...names }) => toPromotion(row, names, creatorRole === 'admin', byId.get(row.id), now))
}

export function toPromotion(
  r: PromotionRow,
  names: { vendorName: string | null; vendorSlug: string | null; productName: string | null },
  byAdmin: boolean,
  totals?: { impressions: number; clicks: number },
  now = new Date(),
): Promotion {
  return {
    id: r.id,
    kind: r.kind,
    state: promotionState(r, now),
    vendorId: r.vendorId,
    vendorName: names.vendorName,
    vendorSlug: names.vendorSlug,
    productId: r.productId,
    productName: names.productName,
    headline: r.headline,
    imageUrl: publicFileUrl(r.imageKey) ?? null,
    linkUrl: r.linkUrl,
    city: r.city,
    category: r.category as CategoryId | null,
    durationDays: r.durationDays,
    price: r.price,
    startsAt: r.startsAt.toISOString(),
    endsAt: r.endsAt.toISOString(),
    paymentRef: r.paymentRef,
    adminNote: r.adminNote,
    createdAt: r.createdAt.toISOString(),
    byAdmin,
    impressions: totals?.impressions ?? 0,
    clicks: totals?.clicks ?? 0,
  }
}

// --- Targeting ----------------------------------------------------------------

let centres: { at: number; list: { city: string; lat: number; lng: number }[] } | null = null

/** Centre of each city with verified businesses (cached for 5 minutes). */
export async function cityCentres() {
  if (centres && Date.now() - centres.at < 5 * 60_000) return centres.list
  const { vendors } = schema
  const rows = await useDb()
    .select({ city: sql<string>`min(trim(${vendors.city}))`, lat: sql<number>`avg(${vendors.lat})::float8`, lng: sql<number>`avg(${vendors.lng})::float8` })
    .from(vendors).where(eq(vendors.status, 'verified')).groupBy(sql`lower(trim(${vendors.city}))`)
  centres = { at: Date.now(), list: rows.filter((r) => r.city).sort((a, b) => a.city.localeCompare(b.city)) }
  return centres.list
}

/**
 * Which city the shopper is looking at: the nearest city centre within 60 km
 * of where they're searching from. Undefined when browsing anywhere (no
 * location); null when they're far from every city.
 */
export async function shopperCity(origin: LatLng | null): Promise<string | null | undefined> {
  if (!origin) return undefined
  let best: { city: string; km: number } | null = null
  for (const c of await cityCentres()) {
    const km = haversineKm(origin, c)
    if (km <= 60 && (!best || km < best.km)) best = { city: c.city, km }
  }
  return best?.city ?? null
}

/** Running promotions of one kind for a city and category. */
function liveWhere(kind: PromotionKind, city: string | null | undefined, category: string, now: Date): SQL {
  const { promotions: p } = schema
  return and(
    eq(p.status, 'approved'),
    eq(p.kind, kind),
    lte(p.startsAt, now),
    gt(p.endsAt, now),
    // Browsing anywhere sees every city; otherwise everywhere-promotions plus that city's.
    city === undefined ? undefined : city === null ? isNull(p.city) : or(isNull(p.city), sql`lower(${p.city}) = lower(${city})`),
    // Category-targeted promotions only show when that category is being browsed.
    category ? or(isNull(p.category), eq(p.category, category)) : isNull(p.category),
  )!
}

function shuffle<T>(list: T[]): T[] {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

/** One promotion per vendor, in a fresh random order each time so paid slots share the exposure. */
function onePerVendor<T extends { vendorId: string | null }>(rows: T[]): T[] {
  const seen = new Set<string>()
  return shuffle(rows).filter((r) => (r.vendorId ? !seen.has(r.vendorId) && !!seen.add(r.vendorId) : true))
}

const LIMITS = {
  home: { featured: 6, banners: 5, products: 1 },
  search: { featured: 2, banners: 1, products: 1 },
}

/**
 * What to show in the sponsored slots of the home page or a search.
 * Featured businesses must still match the shopper's filters (category,
 * rating, open now…); only the distance limit is relaxed, and the card shows
 * how far away they are.
 */
export async function promotedFor(placement: 'home' | 'search', f: SearchFilters, origin: LatLng | null): Promise<Promoted> {
  const now = new Date()
  const city = await shopperCity(origin)
  const limits = LIMITS[placement]
  const filters: SearchFilters = placement === 'home'
    ? { q: '', category: '', minRating: 0, openNow: false, verifiedOnly: true, delivery: false, pickup: false, radiusKm: 0, sort: 'nearest' }
    : { ...f, radiusKm: 0 }
  const [featured, banners, products] = await Promise.all([
    featuredVendors(filters, origin, city, now, limits.featured),
    bannerAds(filters.category, city, now, limits.banners),
    promotedProducts(filters, origin, city, now, limits.products),
  ])
  return { featured, banners, products }
}

async function featuredVendors(f: SearchFilters, origin: LatLng | null, city: string | null | undefined, now: Date, limit: number): Promise<PromotedVendor[]> {
  const { promotions: p } = schema
  const live = await useDb().select({ id: p.id, vendorId: p.vendorId }).from(p).where(liveWhere('featured', city, f.category, now))
  if (!live.length) return []
  const matching = await searchVendors(f, origin, { ids: [...new Set(live.map((l) => l.vendorId!))] })
  const byId = new Map(matching.map((v) => [v.id, v]))
  return onePerVendor(live.filter((l) => byId.has(l.vendorId!)))
    .slice(0, limit)
    .map((l) => ({ ...byId.get(l.vendorId!)!, promotionId: l.id }))
}

async function bannerAds(category: string, city: string | null | undefined, now: Date, limit: number): Promise<PromotedBanner[]> {
  const { promotions: p, vendors: v } = schema
  const rows = await useDb()
    .select({ p, vendorName: v.name, vendorSlug: v.slug, coverTint: v.coverTint, vendorStatus: v.status })
    .from(p).leftJoin(v, eq(v.id, p.vendorId))
    .where(liveWhere('banner', city, category, now))
  return onePerVendor(rows.map((r) => ({ ...r, vendorId: r.p.vendorId })))
    .filter((r) => !r.p.vendorId || r.vendorStatus === 'verified')
    .slice(0, limit)
    .map(({ p: row, vendorName, vendorSlug, coverTint }) => {
      const link = row.linkUrl ?? (row.productId ? `/p/${row.productId}` : `/v/${vendorSlug}`)
      return {
        promotionId: row.id,
        headline: row.headline ?? vendorName ?? 'Kusa',
        imageUrl: publicFileUrl(row.imageKey) ?? null,
        sponsor: vendorName ?? 'Kusa',
        tint: coverTint ?? '#E3F1EA',
        link,
        external: /^https?:\/\//.test(link),
      }
    })
}

async function promotedProducts(f: SearchFilters, origin: LatLng | null, city: string | null | undefined, now: Date, limit: number): Promise<PromotedProduct[]> {
  const { promotions: p, products: pr, vendors: v } = schema
  const where: (SQL | undefined)[] = [liveWhere('product', city, f.category, now), eq(pr.available, true), eq(v.status, 'verified')]
  if (f.category) where.push(eq(v.category, f.category))
  const q = f.q.trim()
  if (q) {
    const like = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`
    where.push(or(ilike(pr.name, like), ilike(pr.description, like)))
  }
  const rows = await useDb().select({ id: p.id, vendorId: p.vendorId, product: pr, vendor: v })
    .from(p).innerJoin(pr, eq(pr.id, p.productId)).innerJoin(v, eq(v.id, pr.vendorId))
    .where(and(...where))
  const picked = onePerVendor(rows).slice(0, limit)
  const metas = await withMeta(picked.map((r) => r.vendor), origin)
  return picked.map((r, i) => ({ promotionId: r.id, product: toProduct(r.product), vendor: metas[i]! }))
}

// --- Stats --------------------------------------------------------------------

/** Count an impression or click, only while the promotion is running. */
export async function recordPromotionEvent(id: string, event: 'impression' | 'click') {
  const { promotions: p, promotionDailyStats: s } = schema
  const db = useDb()
  const now = new Date()
  const [live] = await db.select({ id: p.id }).from(p)
    .where(and(eq(p.id, id), eq(p.status, 'approved'), lte(p.startsAt, now), gt(p.endsAt, now))).limit(1)
  if (!live) return false
  const inc = { impressions: event === 'impression' ? 1 : 0, clicks: event === 'click' ? 1 : 0 }
  await db.insert(s).values({ promotionId: id, day: todayLagos(), ...inc }).onConflictDoUpdate({
    target: [s.promotionId, s.day],
    set: { impressions: sql`${s.impressions} + ${inc.impressions}`, clicks: sql`${s.clicks} + ${inc.clicks}` },
  })
  return true
}
