import type {
  Product, Review, ReviewStatus, SearchFilters, SessionUser, ShopperStatus, Vendor, VendorStats, VendorStatus, VendorWithMeta,
} from '#shared/types'
import type {
  AdminReview, AdminShopper, AdminVendor, Area, AuthResult, CodeSent, LatLng, NewProductInput, NewVendorInput,
  ProductWithVendor, PublicReview, TrafficEvent, TrafficSourceKey, UploadKind, UploadResult, VerificationInput,
} from '#shared/types/api'

export type * from '#shared/types/api'

/** Everything the app asks of the Kusa API (server/api). */
export interface KusaApi {
  // Shopper
  // origin is null when the shopper browses without a location (no distances)
  searchVendors(filters: SearchFilters, origin: LatLng | null): Promise<VendorWithMeta[]>
  getVendor(slug: string, origin: LatLng | null): Promise<VendorWithMeta | null>
  listProducts(vendorId: string): Promise<Product[]>
  getProduct(id: string, origin: LatLng | null): Promise<ProductWithVendor | null>
  latestProducts(origin: LatLng | null, limit: number): Promise<ProductWithVendor[]>
  listAreas(): Promise<Area[]>
  listReviews(vendorId: string): Promise<PublicReview[]>
  myReview(vendorId: string): Promise<Review | null>
  saveReview(input: { vendorId: string; stars: number; tags: string[]; text: string }): Promise<Review>
  reportReview(reviewId: string, reason: string): Promise<void>
  recordEvent(vendorId: string, event: TrafficEvent, opts?: { firstVisitToday?: boolean; productId?: string; source?: TrafficSourceKey }): Promise<void>

  // Auth
  requestCode(phone: string): Promise<CodeSent>
  verifyCode(phone: string, code: string, name?: string): Promise<AuthResult>
  me(): Promise<SessionUser>
  signOut(): Promise<void>

  // Uploads
  uploadPhoto(dataUrl: string, kind: UploadKind): Promise<UploadResult>

  // Vendor (the signed-in vendor's own business)
  getMyVendor(): Promise<Vendor | null>
  registerVendor(input: NewVendorInput): Promise<{ vendor: Vendor; user: SessionUser }>
  submitVerification(input: VerificationInput): Promise<Vendor>
  getVendorStats(): Promise<VendorStats | null>
  vendorProducts(): Promise<Product[]>
  setProductAvailable(productId: string, available: boolean): Promise<void>
  createProduct(input: NewProductInput): Promise<Product>

  // Admin
  adminVendors(): Promise<AdminVendor[]>
  adminVendor(id: string): Promise<AdminVendor | null>
  adminVendorProducts(id: string): Promise<Product[]>
  setVendorStatus(id: string, status: VendorStatus, reason?: string): Promise<void>
  adminReviews(): Promise<AdminReview[]>
  setReviewStatus(id: string, status: ReviewStatus): Promise<void>
  adminShoppers(): Promise<AdminShopper[]>
  setShopperStatus(id: string, status: ShopperStatus, reason?: string): Promise<void>
}
