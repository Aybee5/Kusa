import type {
  CategoryId, Product, Review, ReviewStatus, SearchFilters, SessionUser, Shopper, ShopperStatus,
  Vendor, VendorStats, VendorStatus, VendorWithMeta,
} from '~/types'

export interface LatLng { lat: number; lng: number }

export interface ProductWithVendor { product: Product; vendor: VendorWithMeta }

export interface PublicReview extends Review { authorName: string; authorInitials: string; authorTint: string }

export interface AdminReview extends Review { authorName: string; vendorName: string; authorReviewCount: number; authorJoinedAt: string; authorStatus: ShopperStatus }

export interface AdminShopper extends Shopper { ratingCount: number; flagCount: number }

export interface AdminVendor extends Vendor { listingCount: number; ratingAverage: number; ratingCount: number }

export interface NewVendorInput {
  name: string
  category: CategoryId
  whatsapp: string
  landmark: string
  lat: number
  lng: number
  delivery: boolean
  pickup: boolean
  ownerName: string
}

export interface NewProductInput {
  vendorId: string
  name: string
  price: number
  description: string
  image?: string
}

export type TrafficEvent = 'view' | 'whatsapp' | 'call' | 'directions'

/**
 * Everything the app needs from the backend. `mock/` implements it on demo
 * data; `http.ts` is the same contract over REST, to be pointed at the real
 * API with NUXT_PUBLIC_API_BASE.
 */
export interface KusaApi {
  // Shopper
  searchVendors(filters: SearchFilters, origin: LatLng): Promise<VendorWithMeta[]>
  getVendor(slug: string, origin: LatLng): Promise<VendorWithMeta | null>
  listProducts(vendorId: string): Promise<Product[]>
  getProduct(id: string, origin: LatLng): Promise<ProductWithVendor | null>
  latestProducts(origin: LatLng, limit: number): Promise<ProductWithVendor[]>
  listReviews(vendorId: string): Promise<PublicReview[]>
  myReview(vendorId: string, shopperId: string): Promise<Review | null>
  saveReview(input: { vendorId: string; shopperId: string; stars: number; tags: string[]; text: string }): Promise<Review>
  reportReview(reviewId: string, reason: string): Promise<void>
  recordEvent(vendorId: string, event: TrafficEvent, opts?: { firstVisitToday?: boolean; productId?: string }): Promise<void>

  // Auth
  requestCode(phone: string): Promise<void>
  verifyCode(phone: string, code: string): Promise<SessionUser>

  // Vendor
  getMyVendor(vendorId: string): Promise<Vendor | null>
  registerVendor(input: NewVendorInput): Promise<Vendor>
  submitVerification(vendorId: string, docs: { idType: string; hasSelfie: boolean; hasBusinessProof: boolean }): Promise<Vendor>
  getVendorStats(vendorId: string): Promise<VendorStats | null>
  vendorProducts(vendorId: string): Promise<Product[]>
  setProductAvailable(productId: string, available: boolean): Promise<void>
  createProduct(input: NewProductInput): Promise<Product>

  // Admin
  adminVendors(): Promise<AdminVendor[]>
  adminVendor(id: string): Promise<AdminVendor | null>
  setVendorStatus(id: string, status: VendorStatus, reason?: string): Promise<void>
  adminReviews(): Promise<AdminReview[]>
  setReviewStatus(id: string, status: ReviewStatus): Promise<void>
  adminShoppers(): Promise<AdminShopper[]>
  setShopperStatus(id: string, status: ShopperStatus, reason?: string): Promise<void>
}
