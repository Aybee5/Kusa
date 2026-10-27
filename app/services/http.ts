import type { SearchFilters } from '#shared/types'
import type { KusaApi } from './api'

interface Options {
  baseURL: string
  getToken: () => Promise<string | null>
  onUnauthorized: () => void
}

function messageOf(data?: { statusMessage?: string; message?: string }): string | undefined {
  if (data?.statusMessage === 'Validation Error') {
    try {
      const issue = JSON.parse(data.message ?? '[]')[0] as { message?: string; path?: string[] } | undefined
      return issue ? `Please check ${issue.path?.join('.') || 'the form'}: ${issue.message}` : undefined
    } catch {
      return 'Please check the form and try again.'
    }
  }
  return data?.message || data?.statusMessage || undefined
}

/** The Kusa API over HTTP (server/api). */
export function createHttpApi({ baseURL, getToken, onUnauthorized }: Options): KusaApi {
  async function call<T>(path: string, opts: { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; query?: Record<string, unknown>; body?: object } = {}): Promise<T> {
    const token = await getToken()
    try {
      return await $fetch<T>(path, {
        baseURL,
        method: opts.method ?? 'GET',
        query: opts.query,
        body: opts.body as Record<string, unknown> | undefined,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
    } catch (e) {
      const err = e as { statusCode?: number; data?: { statusMessage?: string; message?: string } }
      if (err.statusCode === 401 && token) onUnauthorized()
      // Surface the server's message ("That code is not right") to the UI.
      throw new Error(messageOf(err.data) ?? 'Something went wrong. Please check your connection and try again.', { cause: e })
    }
  }
  const orNull = <T>(p: Promise<T>) => p.catch((e: Error & { cause?: { statusCode?: number } }) => {
    if (e.cause?.statusCode === 404) return null
    throw e
  })
  const searchQuery = (f: SearchFilters) => ({
    q: f.q || undefined, category: f.category || undefined, minRating: f.minRating || undefined, openNow: f.openNow || undefined,
    delivery: f.delivery || undefined, pickup: f.pickup || undefined, radiusKm: f.radiusKm || undefined, sort: f.sort,
  })

  return {
    searchVendors: (f, origin) => call('/vendors', { query: { ...searchQuery(f), ...origin } }),
    getVendor: (slug, origin) => orNull(call(`/vendors/${encodeURIComponent(slug)}`, { query: { ...origin } })),
    listProducts: (vendorId) => call(`/vendors/${vendorId}/products`),
    getProduct: (id, origin) => orNull(call(`/products/${encodeURIComponent(id)}`, { query: { ...origin } })),
    latestProducts: (origin, limit) => call('/products/latest', { query: { ...origin, limit } }),
    listAreas: () => call('/areas'),
    listReviews: (vendorId) => call(`/vendors/${vendorId}/reviews`),
    myReview: (vendorId) => call(`/vendors/${vendorId}/reviews/mine`),
    saveReview: ({ vendorId, ...body }) => call(`/vendors/${vendorId}/reviews`, { method: 'POST', body }),
    reportReview: (reviewId, reason) => call(`/reviews/${reviewId}/report`, { method: 'POST', body: { reason } }),
    recordEvent: (vendorId, event, opts) => call<void>(`/vendors/${vendorId}/events`, { method: 'POST', body: { event, ...opts } }).catch(() => {}),

    promoted: (placement, f, origin) => call('/promoted', { query: { placement, ...(f ? searchQuery(f) : {}), ...origin } }),
    recordPromotionEvent: (id, event) => call<void>(`/promotions/${id}/events`, { method: 'POST', body: { event } }).catch(() => {}),

    signInOptions: () => call('/auth/options'),
    requestCode: (to) => call('/auth/code', { method: 'POST', body: to }),
    verifyCode: (to, code, name) => call('/auth/verify', { method: 'POST', body: { ...to, code, name } }),
    me: () => call('/auth/me'),
    signOut: () => call<void>('/auth/logout', { method: 'POST' }).catch(() => {}),

    uploadPhoto: (dataUrl, kind) => call('/uploads', { method: 'POST', body: { dataUrl, kind } }),

    getMyVendor: () => orNull(call('/me/vendor')),
    registerVendor: (input) => call('/me/vendor', { method: 'POST', body: input }),
    updateMyVendor: (changes) => call('/me/vendor', { method: 'PATCH', body: changes }),
    submitVerification: (input) => call('/me/vendor/verification', { method: 'POST', body: input }),
    getVendorStats: () => orNull(call('/me/vendor/stats')),
    vendorProducts: () => call('/me/products'),
    setProductAvailable: (id, available) => call<void>(`/me/products/${id}`, { method: 'PATCH', body: { available } }).then(() => {}),
    createProduct: (input) => call('/me/products', { method: 'POST', body: input }),
    updateProduct: (id, changes) => call(`/me/products/${id}`, { method: 'PATCH', body: changes }),
    deleteProduct: (id) => call<void>(`/me/products/${id}`, { method: 'DELETE' }).then(() => {}),
    promotionPlans: () => call('/promotions/plans'),
    myPromotions: () => call('/me/promotions'),
    requestPromotion: (input) => call('/me/promotions', { method: 'POST', body: input }),
    updateMyPromotion: (id, change) => call(`/me/promotions/${id}`, { method: 'PATCH', body: change }),

    adminVendors: () => call('/admin/vendors'),
    adminVendor: (id) => orNull(call(`/admin/vendors/${id}`)),
    adminVendorProducts: (id) => call(`/admin/vendors/${id}/products`),
    setVendorStatus: (id, status, reason) => call<void>(`/admin/vendors/${id}`, { method: 'PATCH', body: { status, reason } }).then(() => {}),
    adminReviews: () => call('/admin/reviews'),
    setReviewStatus: (id, status) => call<void>(`/admin/reviews/${id}`, { method: 'PATCH', body: { status } }).then(() => {}),
    adminShoppers: () => call('/admin/shoppers'),
    setShopperStatus: (id, status, reason) => call<void>(`/admin/shoppers/${id}`, { method: 'PATCH', body: { status, reason } }).then(() => {}),
    adminPromotions: () => call('/admin/promotions'),
    createPromotion: (input) => call('/admin/promotions', { method: 'POST', body: input }),
    decidePromotion: (id, action, note) => call(`/admin/promotions/${id}`, { method: 'PATCH', body: { action, note } }),
  }
}
