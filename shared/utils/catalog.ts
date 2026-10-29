import type { Category, CategoryId, OpeningHours, OpenState, RatingSummary } from '../types'

export const CATEGORIES: Category[] = [
  { id: 'small-chops', label: 'Small chops & snacks', tint: '#F6E3C8', dot: '#C7832C',
    keywords: ['small chops', 'snacks', 'puff puff', 'samosa', 'spring roll', 'chin chin', 'plantain chips', 'meat pie', 'gizzard', 'coconut candy'] },
  { id: 'quick-meals', label: 'Quick meals', tint: '#F3D6CC', dot: '#B85A3E', keywords: ['food', 'suya', 'kilishi', 'jollof', 'asun', 'shawarma', 'rice'] },
  { id: 'drinks', label: 'Drinks', tint: '#F1D3DA', dot: '#B04A63', keywords: ['zobo', 'kunu', 'tiger nut', 'juice', 'smoothie', 'fura'] },
  { id: 'cakes', label: 'Cakes & pastries', tint: '#FBE7D9', dot: '#CF7A45', keywords: ['cake', 'cupcake', 'bread', 'pastry', 'doughnut', 'chin chin'] },
  { id: 'clothing', label: 'Clothing', tint: '#DCE5F3', dot: '#3D63A6',
    keywords: ['clothes', 'abaya', 'jalabiya', 'kaftan', 'hijab', 'ankara', 'agbada', 'senator', 'babban riga', 'kaba', 'gown', 'aso oke', 'lace', 'atampa', 'boubou'] },
  { id: 'fashion', label: 'Shoes & accessories', tint: '#D9EBE6', dot: '#2E7C6B', keywords: ['shoes', 'sneakers', 'slides', 'sandals', 'bags', 'caps', 'fashion', 'watches'] },
  { id: 'jewellery', label: 'Jewellery', tint: '#E4E1F2', dot: '#6A5FB0', keywords: ['beads', 'waist beads', 'necklace', 'earrings', 'bracelet', 'gold'] },
  { id: 'beauty', label: 'Beauty', tint: '#EFE0EC', dot: '#9A4F8C', keywords: ['henna', 'lalle', 'makeup', 'hair', 'braids', 'nails', 'skincare', 'perfume', 'turare'] },
]

/** Old category ids that were merged into others. */
const CATEGORY_ALIASES: Record<string, CategoryId> = { snacks: 'small-chops' }
export const canonicalCategory = (id: string) => CATEGORY_ALIASES[id] ?? id

/** Categories a search term points to: "abaya" → Clothing, "snacks" → Small chops & snacks. */
export function categoriesMatching(q: string): CategoryId[] {
  const t = q.trim().toLowerCase()
  if (t.length < 3) return []
  return CATEGORIES.filter((c) => c.label.toLowerCase().includes(t) || c.keywords.some((k) => k.includes(t) || t.includes(k))).map((c) => c.id)
}

export function categoryLabel(id: CategoryId | string): string {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id
}

/** Review tags shoppers can pick, by category. */
export function reviewTagsFor(category: CategoryId): string[] {
  const food = ['Tasty', 'On time', 'Good packaging', 'Fair price', 'Friendly', 'Quick replies']
  const goods = ['Good quality', 'As pictured', 'On time', 'Fair price', 'Friendly', 'Quick replies']
  const service = ['Skilled', 'On time', 'Clean', 'Fair price', 'Friendly', 'Quick replies']
  if (['small-chops', 'quick-meals', 'drinks', 'cakes'].includes(category)) return food
  if (category === 'beauty') return service
  return goods
}

export function formatNaira(amount: number): string {
  return '₦' + Math.round(amount).toLocaleString('en-NG')
}

export function formatKm(km: number | null): string {
  if (km == null) return ''
  return km < 1 ? `${Math.round(km * 1000 / 50) * 50} m` : `${km.toFixed(1)} km`
}

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

/** Current day and minutes since midnight in Lagos time. */
export function lagosNow(date = new Date()): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date)
  const get = (t: string) => parts.find((x) => x.type === t)?.value ?? '0'
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return { day: days.indexOf(get('weekday')), minutes: Number(get('hour')) * 60 + Number(get('minute')) }
}

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

export function formatClock(hhmm: string): string {
  const min = toMin(hhmm)
  const h = Math.floor(min / 60)
  const m = min % 60
  const suffix = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return m ? `${h12}:${String(m).padStart(2, '0')}${suffix}` : `${h12}${suffix}`
}

export function openStateFor(hours: OpeningHours, now = lagosNow()): OpenState {
  const opens = toMin(hours.opens)
  const closes = toMin(hours.closes)
  const closedToday = hours.closedDays.includes(now.day)
  const open = !closedToday && now.minutes >= opens && now.minutes < closes
  if (open) {
    const closingSoon = closes - now.minutes <= 60
    return { open, closingSoon, label: closingSoon ? `Closes soon · ${formatClock(hours.closes)}` : `Open · till ${formatClock(hours.closes)}` }
  }
  if (!closedToday && now.minutes < opens) return { open, closingSoon: false, label: `Closed · opens ${formatClock(hours.opens)}` }
  return { open, closingSoon: false, label: 'Closed · opens tomorrow' }
}

export function emptyRating(): RatingSummary {
  return { average: 0, count: 0, breakdown: [0, 0, 0, 0, 0] }
}

export function maskPhone(phone: string): string {
  const d = phone.replace(/\D/g, '')
  if (d.length < 8) return phone
  return `+${d.slice(0, 3)} ${d.slice(3, 6)} ••• ${d.slice(-4)}`
}

export function formatDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' })
}

export function relativeDay(iso: string, today: string): string {
  const diff = Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${iso}T12:00:00Z`)) / 86400000)
  if (diff <= 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return `${diff} days ago`
  if (diff < 14) return '1 week ago'
  if (diff < 30) return `${Math.floor(diff / 7)} weeks ago`
  return formatDate(iso)
}

export function todayLagos(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

/** Where "near me" is measured from until the shopper shares their location. */
export const DEFAULT_LOCATION = {
  lat: 11.9965,
  lng: 8.531,
  label: 'Nassarawa GRA, Kano',
}

/** Nigerian phone number in +234XXXXXXXXXX form, or null if it isn't one. */
export function normalizeNgPhone(input: string): string | null {
  const d = input.replace(/\D/g, '').replace(/^234/, '').replace(/^0/, '')
  return /^[789][01]\d{8}$/.test(d) ? `+234${d}` : null
}

/** Lower-cased email if it looks valid, else null. */
export function normalizeEmail(input: string): string | null {
  const e = input.trim().toLowerCase()
  return e.length <= 254 && /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(e) ? e : null
}

/** "ai•••@gmail.com" */
export function maskEmail(email: string): string {
  const [name = '', domain = ''] = email.split('@')
  return `${name.slice(0, 2)}${'•'.repeat(Math.min(5, Math.max(1, name.length - 2)))}@${domain}`
}

/** How to show an account: email or phone, partly hidden. */
export function accountLabel(u: { email?: string | null; phone?: string | null }): string {
  return u.email ? maskEmail(u.email) : u.phone ? maskPhone(u.phone) : ''
}

/** Instagram username from "@name", "name" or an instagram.com link; null if it isn't one. */
export function normalizeInstagram(input: string): string | null {
  const raw = input.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/[/?#].*$/, '')
  return /^[A-Za-z0-9._]{1,30}$/.test(raw) ? raw.toLowerCase() : null
}

export function initialsOf(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || 'K'
}

export function slugify(name: string): string {
  return name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60) || 'shop'
}
