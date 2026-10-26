import type {
  Product, RatingSummary, Review, Shopper, SearchFilters, Vendor, VendorStats, VendorWithMeta,
} from '~/types'
import type { AdminReview, AdminShopper, AdminVendor, KusaApi, LatLng, ProductWithVendor, PublicReview } from '../api'
import { buildAllStats, products, reviews, seedRatings, shoppers, vendors } from './seed'
import { categoryLabel, emptyRating, haversineKm, openStateFor, todayLagos } from '~/utils/catalog'

export interface MockDb {
  vendors: Vendor[]
  products: Product[]
  reviews: Review[]
  shoppers: Shopper[]
  stats: VendorStats[]
  seedRatings: Record<string, [number, number, number, number, number]>
}

export function createMockDb(): MockDb {
  const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x))
  return {
    vendors: clone(vendors),
    products: clone(products),
    reviews: clone(reviews),
    shoppers: clone(shoppers),
    stats: buildAllStats(todayLagos()),
    seedRatings: clone(seedRatings),
  }
}

const wait = (ms = 120) => new Promise((r) => setTimeout(r, ms))
let seq = 1000
const newId = (prefix: string) => `${prefix}${++seq}`

export function createMockApi(getDb: () => MockDb): KusaApi {
  const db = () => getDb()

  // A review counts publicly when it's published and its author isn't suspended.
  const isVisible = (r: Review) => r.status === 'published' && db().shoppers.find((s) => s.id === r.shopperId)?.status !== 'suspended'

  function ratingFor(vendorId: string): RatingSummary {
    const base = db().seedRatings[vendorId] ?? [0, 0, 0, 0, 0]
    const breakdown = [...base] as RatingSummary['breakdown']
    for (const r of db().reviews) {
      if (r.vendorId === vendorId && isVisible(r)) breakdown[5 - r.stars] = (breakdown[5 - r.stars] ?? 0) + 1
    }
    const count = breakdown.reduce((a, b) => a + b, 0)
    if (!count) return emptyRating()
    const total = breakdown.reduce((sum, n, i) => sum + n * (5 - i), 0)
    return { average: Math.round((total / count) * 10) / 10, count, breakdown }
  }

  function withMeta(v: Vendor, origin: LatLng): VendorWithMeta {
    const list = db().products.filter((p) => p.vendorId === v.id)
    const prices = list.flatMap((p) => (p.options?.length ? p.options.map((o) => o.price) : [p.price]))
    return {
      ...v,
      rating: ratingFor(v.id),
      distanceKm: haversineKm(origin, v),
      openState: openStateFor(v.hours),
      productCount: list.length,
      fromPrice: prices.length ? Math.min(...prices) : null,
    }
  }

  const shopperById = (id: string) => db().shoppers.find((s) => s.id === id)

  const api: KusaApi = {
    async searchVendors(f: SearchFilters, origin) {
      await wait()
      const q = f.q.trim().toLowerCase()
      const productMatches = new Set(
        q ? db().products.filter((p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)).map((p) => p.vendorId) : [],
      )
      let list = db().vendors
        .filter((v) => v.status === 'verified')
        .map((v) => withMeta(v, origin))
        .filter((v) => !f.category || v.category === f.category)
        .filter((v) => !q || v.name.toLowerCase().includes(q) || categoryLabel(v.category).toLowerCase().includes(q) || v.area.toLowerCase().includes(q) || productMatches.has(v.id))
        .filter((v) => !f.minRating || v.rating.average >= f.minRating)
        .filter((v) => !f.openNow || v.openState.open)
        .filter((v) => !f.delivery || v.delivery)
        .filter((v) => !f.pickup || v.pickup)
        .filter((v) => !f.radiusKm || v.distanceKm <= f.radiusKm)
      list = list.sort((a, b) =>
        f.sort === 'top-rated' ? b.rating.average - a.rating.average || b.rating.count - a.rating.count : a.distanceKm - b.distanceKm,
      )
      return list
    },

    async getVendor(slug, origin) {
      await wait(60)
      const v = db().vendors.find((x) => x.slug === slug && x.status === 'verified')
      return v ? withMeta(v, origin) : null
    },

    async listProducts(vendorId) {
      await wait(60)
      return db().products.filter((p) => p.vendorId === vendorId)
    },

    async getProduct(id, origin) {
      await wait(60)
      const product = db().products.find((p) => p.id === id)
      const vendor = product && db().vendors.find((v) => v.id === product.vendorId && v.status === 'verified')
      return product && vendor ? { product, vendor: withMeta(vendor, origin) } : null
    },

    async latestProducts(origin, limit) {
      await wait()
      const live = new Map(db().vendors.filter((v) => v.status === 'verified').map((v) => [v.id, v]))
      return db().products
        .filter((p) => live.has(p.vendorId) && p.available)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit)
        .map((product): ProductWithVendor => ({ product, vendor: withMeta(live.get(product.vendorId)!, origin) }))
    },

    async listReviews(vendorId) {
      await wait(60)
      return db().reviews
        .filter((r) => r.vendorId === vendorId && isVisible(r))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((r): PublicReview => {
          const s = shopperById(r.shopperId)
          const parts = (s?.name ?? 'Shopper').split(' ')
          const short = parts.length > 1 ? `${parts[0]} ${parts[1]?.[0]}.` : parts[0]!
          return { ...r, authorName: short, authorInitials: s?.initials ?? 'S', authorTint: s?.tint ?? '#E3F1EA' }
        })
    },

    async myReview(vendorId, shopperId) {
      return db().reviews.find((r) => r.vendorId === vendorId && r.shopperId === shopperId) ?? null
    },

    async saveReview({ vendorId, shopperId, stars, tags, text }) {
      await wait(200)
      const existing = db().reviews.find((r) => r.vendorId === vendorId && r.shopperId === shopperId)
      if (existing) {
        Object.assign(existing, { stars, tags, text, createdAt: todayLagos(), status: existing.status === 'hidden' ? 'hidden' : 'published' })
        return existing
      }
      const review: Review = { id: newId('r'), vendorId, shopperId, stars, tags, text, createdAt: todayLagos(), status: 'published' }
      db().reviews.unshift(review)
      return review
    },

    async reportReview(reviewId, reason) {
      await wait()
      const r = db().reviews.find((x) => x.id === reviewId)
      if (r && r.status === 'published') Object.assign(r, { status: 'flagged', flagReason: reason })
    },

    async recordEvent(vendorId, event, opts) {
      const stats = db().stats.find((s) => s.vendorId === vendorId)
      const day = stats?.daily.at(-1)
      if (!stats || !day) return
      if (event === 'view') {
        day.views++
        if (opts?.firstVisitToday) day.visitors++
        if (opts?.productId) stats.productViews[opts.productId] = (stats.productViews[opts.productId] ?? 0) + 1
      } else if (event === 'whatsapp') day.whatsapp++
      else if (event === 'call') day.calls++
      else day.directions++
    },

    async requestCode() {
      await wait(300)
    },

    async verifyCode(phone, code) {
      await wait(300)
      if (code !== '123456') throw new Error('That code is not right. In the demo, use 123456.')
      const digits = phone.replace(/\D/g, '')
      const vendor = db().vendors.find((v) => v.phone.replace(/\D/g, '').endsWith(digits.slice(-10)))
      if (vendor) return { id: vendor.id, name: vendor.ownerName, phone: vendor.phone, role: 'vendor', vendorId: vendor.id }
      const shopper = db().shoppers.find((s) => s.phone.replace(/\D/g, '').endsWith(digits.slice(-10)))
      if (shopper?.status === 'suspended') throw new Error('This account is suspended. Contact support@kusa.ng if you think this is a mistake.')
      if (shopper) return { id: shopper.id, name: shopper.name, phone: shopper.phone, role: 'shopper' }
      const created: Shopper = {
        id: newId('s'), name: 'New shopper', phone: `+234${digits.slice(-10)}`, area: 'Kano', joinedAt: todayLagos(),
        lastActiveAt: todayLagos(), status: 'active', initials: 'NS', tint: '#E3F1EA',
      }
      db().shoppers.push(created)
      return { id: created.id, name: created.name, phone: created.phone, role: 'shopper' }
    },

    async getMyVendor(vendorId) {
      await wait(60)
      return db().vendors.find((v) => v.id === vendorId) ?? null
    },

    async registerVendor(input) {
      await wait(300)
      const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'my-shop'
      const initials = input.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || 'K'
      const v: Vendor = {
        id: newId('v'), slug: `${slug}-${seq}`, name: input.name, ownerName: input.ownerName,
        phone: `+${input.whatsapp}`, whatsapp: input.whatsapp, category: input.category, area: input.landmark || 'Kano', city: 'Kano',
        landmark: input.landmark, lat: input.lat, lng: input.lng, status: 'pending', hours: { opens: '09:00', closes: '18:00', closedDays: [] },
        delivery: input.delivery, pickup: input.pickup, about: '', initials, tint: '#F4B740', coverTint: '#F6E3C8',
        joinedAt: todayLagos(), documents: { idType: '', hasSelfie: false, hasBusinessProof: false },
      }
      db().vendors.push(v)
      db().stats.push({ vendorId: v.id, daily: buildAllStats(todayLagos())[0]!.daily.map((d) => ({ ...d, views: 0, visitors: 0, whatsapp: 0, calls: 0, directions: 0 })), sources: [], productViews: {} })
      return v
    },

    async submitVerification(vendorId, docs) {
      await wait(300)
      const v = db().vendors.find((x) => x.id === vendorId)
      if (!v) throw new Error('Business not found')
      Object.assign(v, { documents: docs, status: 'pending', submittedAt: todayLagos() })
      return v
    },

    async getVendorStats(vendorId) {
      await wait(80)
      return db().stats.find((s) => s.vendorId === vendorId) ?? null
    },

    async vendorProducts(vendorId) {
      await wait(60)
      return db().products.filter((p) => p.vendorId === vendorId)
    },

    async setProductAvailable(productId, available) {
      const p = db().products.find((x) => x.id === productId)
      if (p) p.available = available
    },

    async createProduct(input) {
      await wait(200)
      const v = db().vendors.find((x) => x.id === input.vendorId)
      const product: Product = {
        id: newId('p'), vendorId: input.vendorId, name: input.name, price: input.price, description: input.description,
        tags: [], tint: v?.coverTint ?? '#F6E3C8', photoLabel: input.name, image: input.image, available: true, createdAt: todayLagos(),
      }
      db().products.unshift(product)
      return product
    },

    async adminVendors() {
      await wait(80)
      return db().vendors.map((v): AdminVendor => {
        const r = ratingFor(v.id)
        return { ...v, listingCount: db().products.filter((p) => p.vendorId === v.id).length, ratingAverage: r.average, ratingCount: r.count }
      })
    },

    async adminVendor(id) {
      const all = await api.adminVendors()
      return all.find((v) => v.id === id) ?? null
    },

    async setVendorStatus(id, status, reason) {
      await wait()
      const v = db().vendors.find((x) => x.id === id)
      if (v) Object.assign(v, { status, suspensionReason: status === 'suspended' ? reason : undefined })
    },

    async adminReviews() {
      await wait(80)
      return db().reviews
        .slice()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((r): AdminReview => {
          const s = shopperById(r.shopperId)
          return {
            ...r,
            authorName: s?.name ?? 'Unknown',
            authorJoinedAt: s?.joinedAt ?? '',
            authorStatus: s?.status ?? 'active',
            authorReviewCount: db().reviews.filter((x) => x.shopperId === r.shopperId).length,
            vendorName: db().vendors.find((v) => v.id === r.vendorId)?.name ?? 'Unknown business',
          }
        })
    },

    async setReviewStatus(id, status) {
      await wait()
      const r = db().reviews.find((x) => x.id === id)
      if (r) r.status = status
    },

    async adminShoppers() {
      await wait(80)
      return db().shoppers.map((s): AdminShopper => ({
        ...s,
        ratingCount: db().reviews.filter((r) => r.shopperId === s.id).length,
        flagCount: db().reviews.filter((r) => r.shopperId === s.id && r.status !== 'published').length,
      }))
    },

    async setShopperStatus(id, status, reason) {
      await wait()
      const s = db().shoppers.find((x) => x.id === id)
      if (!s) return
      Object.assign(s, { status, suspensionReason: status === 'suspended' ? reason : undefined })
    },
  }
  return api
}
