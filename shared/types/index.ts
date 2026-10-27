export type CategoryId =
  | 'small-chops'
  | 'snacks'
  | 'quick-meals'
  | 'drinks'
  | 'cakes'
  | 'jewellery'
  | 'fashion'
  | 'beauty'

export interface Category {
  id: CategoryId
  label: string
  tint: string
  dot: string
}

export type VendorStatus = 'pending' | 'verified' | 'changes' | 'rejected' | 'suspended'

export interface OpeningHours {
  /** 24h "HH:MM" in Africa/Lagos time */
  opens: string
  closes: string
  /** 0 = Sunday … 6 = Saturday */
  closedDays: number[]
}

export type ContactChannel = 'whatsapp' | 'instagram' | 'phone'

export interface VendorDocuments {
  idType: string
  hasSelfie: boolean
  hasBusinessProof: boolean
}

export interface Vendor {
  id: string
  slug: string
  name: string
  ownerName: string
  /** Business phone, +234… */
  phone: string
  /** Digits without +; null when the vendor doesn't use WhatsApp. */
  whatsapp: string | null
  /** Username without @; null when not on Instagram. */
  instagram: string | null
  /** Show a Call button. */
  showPhone: boolean
  /** The highlighted contact button. */
  primaryContact: ContactChannel
  category: CategoryId
  area: string
  city: string
  landmark?: string
  lat: number
  lng: number
  status: VendorStatus
  suspensionReason?: string
  /** Message from the admin when changes are requested or the application is rejected. */
  reviewNote?: string
  hours: OpeningHours
  delivery: boolean
  pickup: boolean
  about: string
  initials: string
  tint: string
  coverTint: string
  /** Uploaded cover photo and logo (public URLs). */
  coverImage?: string
  logo?: string
  joinedAt: string
  submittedAt?: string
  documents: VendorDocuments
}

export interface ProductOption {
  label: string
  price: number
}

export interface Product {
  id: string
  vendorId: string
  name: string
  price: number
  options?: ProductOption[]
  description: string
  tags: string[]
  tint: string
  photoLabel: string
  /** Uploaded photo URL. Until uploads go to storage this may be a data URL. */
  image?: string
  available: boolean
  createdAt: string
}

export type ReviewStatus = 'published' | 'flagged' | 'hidden'

export interface Review {
  id: string
  vendorId: string
  shopperId: string
  stars: number
  tags: string[]
  text: string
  createdAt: string
  status: ReviewStatus
  flagReason?: string
}

export type ShopperStatus = 'active' | 'flagged' | 'suspended'

export interface Shopper {
  id: string
  name: string
  phone: string | null
  email: string | null
  area: string
  joinedAt: string
  lastActiveAt: string
  status: ShopperStatus
  suspensionReason?: string
  initials: string
  tint: string
}

/** One day of a vendor's traffic. */
export interface DailyStat {
  date: string
  views: number
  visitors: number
  whatsapp: number
  instagram: number
  calls: number
  directions: number
}

export interface TrafficSource {
  label: string
  share: number
}

export interface VendorStats {
  vendorId: string
  daily: DailyStat[]
  sources: TrafficSource[]
  productViews: Record<string, number>
}

export interface RatingSummary {
  average: number
  count: number
  /** counts for 5, 4, 3, 2, 1 stars */
  breakdown: [number, number, number, number, number]
}

export interface VendorWithMeta extends Vendor {
  rating: RatingSummary
  /** Null when the shopper is browsing without a location. */
  distanceKm: number | null
  openState: OpenState
  productCount: number
  fromPrice: number | null
}

export interface OpenState {
  open: boolean
  closingSoon: boolean
  label: string
}

export type Role = 'shopper' | 'vendor' | 'admin'

export interface SessionUser {
  id: string
  name: string
  phone: string | null
  email: string | null
  role: Role
  vendorId?: string
}

export type SortKey = 'nearest' | 'top-rated'

export interface SearchFilters {
  q: string
  category: CategoryId | ''
  minRating: number
  openNow: boolean
  verifiedOnly: boolean
  delivery: boolean
  pickup: boolean
  radiusKm: number
  sort: SortKey
}
