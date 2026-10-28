import type { Promotion, PromotionKind, PromotionState } from '../types/api'

export const PROMOTION_KINDS: PromotionKind[] = ['featured', 'banner', 'product']

export const PROMOTION_LABELS: Record<PromotionKind, string> = {
  featured: 'Featured business',
  banner: 'Banner ad',
  product: 'Promoted product',
}

/** Status of a promotion at a moment in time. */
export function promotionState(p: { status: string; startsAt: Date | string; endsAt: Date | string }, now = new Date()): PromotionState {
  if (p.status !== 'approved') return p.status as PromotionState
  if (now < new Date(p.startsAt)) return 'scheduled'
  if (now < new Date(p.endsAt)) return 'running'
  return 'ended'
}

/** Whole days left, counting a part day as one. */
export function daysLeft(p: Pick<Promotion, 'endsAt'>, now = new Date()): number {
  return Math.max(0, Math.ceil((new Date(p.endsAt).getTime() - now.getTime()) / 86400000))
}

export function clickRate(p: Pick<Promotion, 'impressions' | 'clicks'>): string {
  return p.impressions ? `${((p.clicks / p.impressions) * 100).toFixed(1)}%` : '–'
}

/** Add days to a YYYY-MM-DD date. */
export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
