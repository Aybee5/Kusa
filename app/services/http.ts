import type { KusaApi } from './api'

/**
 * The KusaApi contract over REST. The paths below are a proposal for the
 * backend; adjust them here when the real API is ready, and the rest of the
 * app keeps working unchanged.
 */
export function createHttpApi(baseURL: string, getToken: () => string | null): KusaApi {
  const call = <T>(path: string, opts: { method?: 'GET' | 'POST' | 'PATCH'; query?: Record<string, unknown>; body?: unknown } = {}) =>
    $fetch<T>(path, {
      baseURL,
      method: opts.method ?? 'GET',
      query: opts.query,
      body: opts.body as Record<string, unknown> | undefined,
      headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : undefined,
    })

  return {
    searchVendors: (filters, origin) => call('/vendors', { query: { ...filters, lat: origin.lat, lng: origin.lng } }),
    getVendor: (slug, origin) => call(`/vendors/${slug}`, { query: { ...origin } }),
    listProducts: (vendorId) => call(`/vendors/${vendorId}/products`),
    getProduct: (id, origin) => call(`/products/${id}`, { query: { ...origin } }),
    latestProducts: (origin, limit) => call('/products/latest', { query: { ...origin, limit } }),
    listReviews: (vendorId) => call(`/vendors/${vendorId}/reviews`),
    myReview: (vendorId) => call(`/vendors/${vendorId}/reviews/mine`),
    saveReview: (input) => call(`/vendors/${input.vendorId}/reviews`, { method: 'POST', body: input }),
    reportReview: (reviewId, reason) => call(`/reviews/${reviewId}/report`, { method: 'POST', body: { reason } }),
    recordEvent: (vendorId, event, opts) => call(`/vendors/${vendorId}/events`, { method: 'POST', body: { event, ...opts } }),

    requestCode: (phone) => call('/auth/code', { method: 'POST', body: { phone } }),
    verifyCode: (phone, code) => call('/auth/verify', { method: 'POST', body: { phone, code } }),

    getMyVendor: (vendorId) => call(`/me/vendor/${vendorId}`),
    registerVendor: (input) => call('/me/vendor', { method: 'POST', body: input }),
    submitVerification: (vendorId, docs) => call(`/me/vendor/${vendorId}/verification`, { method: 'POST', body: docs }),
    getVendorStats: (vendorId) => call(`/me/vendor/${vendorId}/stats`),
    vendorProducts: (vendorId) => call(`/me/vendor/${vendorId}/products`),
    setProductAvailable: (productId, available) => call(`/me/products/${productId}`, { method: 'PATCH', body: { available } }),
    createProduct: (input) => call('/me/products', { method: 'POST', body: input }),

    adminVendors: () => call('/admin/vendors'),
    adminVendor: (id) => call(`/admin/vendors/${id}`),
    setVendorStatus: (id, status, reason) => call(`/admin/vendors/${id}`, { method: 'PATCH', body: { status, reason } }),
    adminReviews: () => call('/admin/reviews'),
    setReviewStatus: (id, status) => call(`/admin/reviews/${id}`, { method: 'PATCH', body: { status } }),
    adminShoppers: () => call('/admin/shoppers'),
    setShopperStatus: (id, status, reason) => call(`/admin/shoppers/${id}`, { method: 'PATCH', body: { status, reason } }),
  }
}
