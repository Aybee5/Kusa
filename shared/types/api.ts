// Shapes exchanged between the app and the API.
import type { CategoryId, Product, Review, SessionUser, Shopper, ShopperStatus, Vendor, VendorWithMeta } from './index'

export interface LatLng { lat: number; lng: number }

export interface ProductWithVendor { product: Product; vendor: VendorWithMeta }

export interface PublicReview extends Review { authorName: string; authorInitials: string; authorTint: string }

export interface AdminReview extends Review {
  authorName: string
  vendorName: string
  authorReviewCount: number
  authorJoinedAt: string
  authorStatus: ShopperStatus
}

export interface AdminShopper extends Shopper { ratingCount: number; flagCount: number }

export interface AdminVendor extends Vendor {
  listingCount: number
  ratingAverage: number
  ratingCount: number
  /** Short-lived links to the verification photos (admins only). */
  documentUrls?: { id?: string; selfie?: string; proof?: string }
  reviewNote?: string
}

export interface Area { city: string; area: string; lat: number; lng: number; count: number }

export interface NewVendorInput {
  name: string
  category: CategoryId
  whatsapp: string
  area: string
  city: string
  landmark: string
  lat: number
  lng: number
  delivery: boolean
  pickup: boolean
}

export interface VerificationInput {
  idType: string
  idPhotoKey: string
  selfieKey: string
  proofKey?: string
}

export interface NewProductInput {
  name: string
  price: number
  description: string
  imageKey?: string
}

export type TrafficEvent = 'view' | 'whatsapp' | 'call' | 'directions'
export type TrafficSourceKey = 'search' | 'map' | 'share' | 'external' | 'direct' | 'ad'

export interface AuthResult { token: string; user: SessionUser }

export interface CodeSent { sent: true; retryAfter: number; devCode?: string }

export type UploadKind = 'product' | 'verification' | 'banner'
export interface UploadResult { key: string; url: string | null }

// --- Promotions ------------------------------------------------------------

export type PromotionKind = 'featured' | 'banner' | 'product'
/** Worked out from status and dates. */
export type PromotionState = 'pending' | 'scheduled' | 'running' | 'ended' | 'rejected' | 'cancelled'

export interface Promotion {
  id: string
  kind: PromotionKind
  state: PromotionState
  vendorId: string | null
  vendorName: string | null
  vendorSlug: string | null
  productId: string | null
  productName: string | null
  headline: string | null
  imageUrl: string | null
  linkUrl: string | null
  /** Null = every city. */
  city: string | null
  /** Null = every category. */
  category: CategoryId | null
  durationDays: number
  price: number
  startsAt: string
  endsAt: string
  paymentRef: string | null
  adminNote: string | null
  createdAt: string
  /** Made by an admin rather than requested by the vendor. */
  byAdmin: boolean
  impressions: number
  clicks: number
}

export interface PromotionPlan {
  kind: PromotionKind
  label: string
  description: string
  prices: { days: number; price: number }[]
}

export interface PromotionPlans {
  plans: PromotionPlan[]
  /** Where vendors send payment; null when not configured (Kusa contacts them instead). */
  payment: { bankName: string; accountName: string; accountNumber: string } | null
  /** Cities that have verified businesses, for targeting. */
  cities: string[]
}

export interface NewPromotionInput {
  kind: PromotionKind
  productId?: string
  headline?: string
  imageKey?: string
  city: string | null
  category: CategoryId | null
  durationDays: number
  /** Lagos date, YYYY-MM-DD. */
  startDate: string
  paymentRef?: string
}

/** Admins can also make house banners (no vendor) and set the price and any duration. */
export interface AdminPromotionInput extends Omit<NewPromotionInput, 'paymentRef'> {
  vendorId?: string
  linkUrl?: string
  price: number
}

export interface PromotedVendor extends VendorWithMeta { promotionId: string }
export interface PromotedProduct extends ProductWithVendor { promotionId: string }
export interface PromotedBanner {
  promotionId: string
  headline: string
  imageUrl: string | null
  /** Who paid for it ("Kusa" for house banners). */
  sponsor: string
  /** Colours for a text-only banner. */
  tint: string
  /** In-app path, or an outside https link. */
  link: string
  external: boolean
}

export interface Promoted {
  featured: PromotedVendor[]
  banners: PromotedBanner[]
  products: PromotedProduct[]
}
