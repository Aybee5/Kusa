import type { Review } from '#shared/types'
import type { ReviewRow } from '../database/schema'

export function toReview(r: ReviewRow): Review {
  return {
    id: r.id,
    vendorId: r.vendorId,
    shopperId: r.userId,
    stars: r.stars,
    tags: r.tags,
    text: r.text,
    createdAt: r.updatedAt.toISOString().slice(0, 10),
    status: r.status,
    flagReason: r.flagReason ?? undefined,
  }
}
