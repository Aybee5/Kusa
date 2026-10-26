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
export type TrafficSourceKey = 'search' | 'map' | 'share' | 'external' | 'direct'

export interface AuthResult { token: string; user: SessionUser }

export interface CodeSent { sent: true; retryAfter: number; devCode?: string }

export type UploadKind = 'product' | 'verification'
export interface UploadResult { key: string; url: string | null }
