import { sql } from 'drizzle-orm'
import {
  boolean, date, doublePrecision, index, integer, jsonb, pgTable, primaryKey, smallint, text, timestamp, uniqueIndex,
} from 'drizzle-orm/pg-core'

const id = () => text('id').primaryKey().$defaultFn(() => crypto.randomUUID())
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow()

/** Everyone who signs in: shoppers, vendors and admins. */
export const users = pgTable('users', {
  id: id(),
  // How they sign in. Each is only ever set from a confirmed code, so both are verified.
  // Depending on SIGNIN_METHODS an account has an email address, a phone number, or both.
  phone: text('phone'),
  email: text('email'),
  name: text('name').notNull().default(''),
  role: text('role', { enum: ['shopper', 'vendor', 'admin'] }).notNull().default('shopper'),
  status: text('status', { enum: ['active', 'flagged', 'suspended'] }).notNull().default('active'),
  suspensionReason: text('suspension_reason'),
  area: text('area').notNull().default(''),
  tint: text('tint').notNull().default('#E3F1EA'),
  createdAt: createdAt(),
  lastActiveAt: timestamp('last_active_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex('users_phone_idx').on(t.phone), uniqueIndex('users_email_idx').on(t.email), index('users_role_status_idx').on(t.role, t.status)])

export const vendors = pgTable('vendors', {
  id: id(),
  ownerId: text('owner_id').notNull().references(() => users.id),
  slug: text('slug').notNull(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  /** Business phone number (+234…), for calls and for Kusa to reach them. */
  phone: text('phone').notNull(),
  // How shoppers reach them. WhatsApp and Instagram are optional; one of the
  // enabled ones is the main (highlighted) button.
  /** Digits without +, e.g. 2348030004417. Null = no WhatsApp button. */
  whatsapp: text('whatsapp'),
  /** Instagram username without @. Null = no Instagram button. */
  instagram: text('instagram'),
  showPhone: boolean('show_phone').notNull().default(true),
  primaryContact: text('primary_contact', { enum: ['whatsapp', 'instagram', 'phone'] }).notNull().default('whatsapp'),
  coverImageKey: text('cover_image_key'),
  logoImageKey: text('logo_image_key'),
  area: text('area').notNull().default(''),
  city: text('city').notNull().default('Kano'),
  /** One of the 36 states or FCT (shared/utils/states.ts). */
  state: text('state').notNull().default('Kano'),
  landmark: text('landmark'),
  lat: doublePrecision('lat').notNull(),
  lng: doublePrecision('lng').notNull(),
  status: text('status', { enum: ['pending', 'verified', 'changes', 'rejected', 'suspended'] }).notNull().default('pending'),
  suspensionReason: text('suspension_reason'),
  reviewNote: text('review_note'),
  opens: text('opens').notNull().default('09:00'),
  closes: text('closes').notNull().default('18:00'),
  closedDays: jsonb('closed_days').$type<number[]>().notNull().default(sql`'[]'::jsonb`),
  delivery: boolean('delivery').notNull().default(true),
  pickup: boolean('pickup').notNull().default(true),
  about: text('about').notNull().default(''),
  tint: text('tint').notNull().default('#F4B740'),
  coverTint: text('cover_tint').notNull().default('#F6E3C8'),
  idType: text('id_type'),
  idPhotoKey: text('id_photo_key'),
  selfieKey: text('selfie_key'),
  proofKey: text('proof_key'),
  createdAt: createdAt(),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  // Rating totals, kept current by database triggers whenever a review or a
  // reviewer's suspension changes (migration 0001). Same rules as the public
  // rating: published reviews from accounts that aren't suspended.
  ratingAvg: doublePrecision('rating_avg').notNull().default(0),
  ratingCount: integer('rating_count').notNull().default(0),
  /** counts for 5, 4, 3, 2, 1 stars */
  ratingBreakdown: jsonb('rating_breakdown').$type<[number, number, number, number, number]>().notNull().default(sql`'[0,0,0,0,0]'::jsonb`),
}, (t) => [
  uniqueIndex('vendors_slug_idx').on(t.slug),
  uniqueIndex('vendors_owner_idx').on(t.ownerId),
  index('vendors_status_idx').on(t.status),
  index('vendors_state_city_idx').on(t.status, t.state, t.city),
  // Bounding-box prefilter for "near me" searches.
  index('vendors_lat_lng_idx').on(t.lat, t.lng),
  // "Top rated" and the minimum-rating filter.
  index('vendors_rating_idx').on(t.status, t.ratingAvg.desc(), t.ratingCount.desc()),
])

export const products = pgTable('products', {
  id: id(),
  vendorId: text('vendor_id').notNull().references(() => vendors.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  price: integer('price').notNull(),
  options: jsonb('options').$type<{ label: string; price: number }[]>(),
  description: text('description').notNull().default(''),
  tags: jsonb('tags').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  tint: text('tint').notNull().default('#F6E3C8'),
  photoLabel: text('photo_label').notNull().default(''),
  imageKey: text('image_key'),
  available: boolean('available').notNull().default(true),
  createdAt: createdAt(),
}, (t) => [index('products_vendor_idx').on(t.vendorId), index('products_created_idx').on(t.createdAt)])

/** One rating per shopper per business; text is optional. */
export const reviews = pgTable('reviews', {
  id: id(),
  vendorId: text('vendor_id').notNull().references(() => vendors.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  stars: smallint('stars').notNull(),
  tags: jsonb('tags').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  text: text('text').notNull().default(''),
  status: text('status', { enum: ['published', 'flagged', 'hidden'] }).notNull().default('published'),
  flagReason: text('flag_reason'),
  createdAt: createdAt(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('reviews_vendor_user_idx').on(t.vendorId, t.userId),
  index('reviews_vendor_status_idx').on(t.vendorId, t.status),
  index('reviews_status_idx').on(t.status),
  index('reviews_user_idx').on(t.userId),
])

/** Sign-in codes, one per email address or phone number ("email:…" / "phone:+234…"). */
export const otpCodes = pgTable('otp_codes', {
  target: text('target').primaryKey(),
  codeHash: text('code_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  attempts: integer('attempts').notNull().default(0),
  sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
})

/** Sign-in sessions. Only a hash of the token is stored. */
export const sessions = pgTable('sessions', {
  tokenHash: text('token_hash').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: createdAt(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
}, (t) => [index('sessions_user_idx').on(t.userId)])

/** Daily traffic per business, in Lagos dates. */
export const vendorDailyStats = pgTable('vendor_daily_stats', {
  vendorId: text('vendor_id').notNull().references(() => vendors.id, { onDelete: 'cascade' }),
  day: date('day').notNull(),
  views: integer('views').notNull().default(0),
  visitors: integer('visitors').notNull().default(0),
  whatsapp: integer('whatsapp').notNull().default(0),
  instagram: integer('instagram').notNull().default(0),
  calls: integer('calls').notNull().default(0),
  directions: integer('directions').notNull().default(0),
}, (t) => [primaryKey({ columns: [t.vendorId, t.day] })])

export const vendorSourceStats = pgTable('vendor_source_stats', {
  vendorId: text('vendor_id').notNull().references(() => vendors.id, { onDelete: 'cascade' }),
  day: date('day').notNull(),
  source: text('source').notNull(),
  views: integer('views').notNull().default(0),
}, (t) => [primaryKey({ columns: [t.vendorId, t.day, t.source] })])

export const productDailyViews = pgTable('product_daily_views', {
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  day: date('day').notNull(),
  views: integer('views').notNull().default(0),
}, (t) => [primaryKey({ columns: [t.productId, t.day] })])

/**
 * Paid placements. Vendors request one (featured business, banner ad or
 * promoted product) for a number of days; an admin approves it once payment is
 * confirmed. Admins can also create placements directly, including house
 * banners with no vendor. Whether one is running is worked out from status +
 * starts_at/ends_at, so nothing has to run when a promotion expires.
 */
export const promotions = pgTable('promotions', {
  id: id(),
  kind: text('kind', { enum: ['featured', 'banner', 'product'] }).notNull(),
  /** Null only for an admin's house banner. */
  vendorId: text('vendor_id').references(() => vendors.id, { onDelete: 'cascade' }),
  /** The promoted product, or the product a banner links to. */
  productId: text('product_id').references(() => products.id, { onDelete: 'cascade' }),
  // Banner content. With no image the app draws a text banner in the vendor's colours.
  headline: text('headline'),
  imageKey: text('image_key'),
  /** House banners only: an outside https link or an in-app path. */
  linkUrl: text('link_url'),
  // Targeting: null means everywhere / every category.
  city: text('city'),
  category: text('category'),
  durationDays: integer('duration_days').notNull(),
  /** Naira, fixed when the request is made. */
  price: integer('price').notNull().default(0),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
  status: text('status', { enum: ['pending', 'approved', 'rejected', 'cancelled'] }).notNull().default('pending'),
  /** Transfer reference or sender name the vendor gives for their payment. */
  paymentRef: text('payment_ref'),
  /** Shown to the vendor, e.g. why a request was rejected. */
  adminNote: text('admin_note'),
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: createdAt(),
  decidedAt: timestamp('decided_at', { withTimezone: true }),
}, (t) => [
  index('promotions_live_idx').on(t.status, t.kind, t.endsAt),
  index('promotions_vendor_idx').on(t.vendorId),
])

/** Impressions and clicks per promotion per Lagos day. */
export const promotionDailyStats = pgTable('promotion_daily_stats', {
  promotionId: text('promotion_id').notNull().references(() => promotions.id, { onDelete: 'cascade' }),
  day: date('day').notNull(),
  impressions: integer('impressions').notNull().default(0),
  clicks: integer('clicks').notNull().default(0),
}, (t) => [primaryKey({ columns: [t.promotionId, t.day] })])

export type UserRow = typeof users.$inferSelect
export type VendorRow = typeof vendors.$inferSelect
export type ProductRow = typeof products.$inferSelect
export type ReviewRow = typeof reviews.$inferSelect
export type PromotionRow = typeof promotions.$inferSelect
