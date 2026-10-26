import { sql } from 'drizzle-orm'
import {
  boolean, date, doublePrecision, index, integer, jsonb, pgTable, primaryKey, smallint, text, timestamp, uniqueIndex,
} from 'drizzle-orm/pg-core'

const id = () => text('id').primaryKey().$defaultFn(() => crypto.randomUUID())
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow()

/** Everyone who signs in: shoppers, vendors and admins. */
export const users = pgTable('users', {
  id: id(),
  phone: text('phone').notNull(),
  name: text('name').notNull().default(''),
  role: text('role', { enum: ['shopper', 'vendor', 'admin'] }).notNull().default('shopper'),
  status: text('status', { enum: ['active', 'flagged', 'suspended'] }).notNull().default('active'),
  suspensionReason: text('suspension_reason'),
  area: text('area').notNull().default(''),
  tint: text('tint').notNull().default('#E3F1EA'),
  createdAt: createdAt(),
  lastActiveAt: timestamp('last_active_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex('users_phone_idx').on(t.phone), index('users_role_status_idx').on(t.role, t.status)])

export const vendors = pgTable('vendors', {
  id: id(),
  ownerId: text('owner_id').notNull().references(() => users.id),
  slug: text('slug').notNull(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  phone: text('phone').notNull(),
  whatsapp: text('whatsapp').notNull(),
  area: text('area').notNull().default(''),
  city: text('city').notNull().default('Kano'),
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
}, (t) => [
  uniqueIndex('vendors_slug_idx').on(t.slug),
  uniqueIndex('vendors_owner_idx').on(t.ownerId),
  index('vendors_status_idx').on(t.status),
  // Bounding-box prefilter for "near me" searches.
  index('vendors_lat_lng_idx').on(t.lat, t.lng),
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
])

export const otpCodes = pgTable('otp_codes', {
  phone: text('phone').primaryKey(),
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

export type UserRow = typeof users.$inferSelect
export type VendorRow = typeof vendors.$inferSelect
export type ProductRow = typeof products.$inferSelect
export type ReviewRow = typeof reviews.$inferSelect
