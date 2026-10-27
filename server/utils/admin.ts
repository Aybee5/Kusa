import { inArray, sql } from 'drizzle-orm'
import type { AdminVendor } from '#shared/types/api'
import type { VendorRow } from '../database/schema'

/** Admin view of businesses: owner, listing count and rating. */
export async function toAdminVendors(rows: VendorRow[], withDocuments = false): Promise<AdminVendor[]> {
  if (!rows.length) return []
  const db = useDb()
  const ids = rows.map((r) => r.id)
  const [counts, owners] = await Promise.all([
    db.select({ vendorId: schema.products.vendorId, n: sql<number>`count(*)::int` }).from(schema.products)
      .where(inArray(schema.products.vendorId, ids)).groupBy(schema.products.vendorId),
    db.select({ id: schema.users.id, name: schema.users.name, email: schema.users.email, phone: schema.users.phone }).from(schema.users).where(inArray(schema.users.id, rows.map((r) => r.ownerId))),
  ])
  const countOf = new Map(counts.map((c) => [c.vendorId, c.n]))
  const ownerOf = new Map(owners.map((o) => [o.id, o]))
  return rows.map((r) => ({
    ...toVendor(r, ownerOf.get(r.ownerId)?.name),
    ownerEmail: ownerOf.get(r.ownerId)?.email ?? null,
    ownerPhone: ownerOf.get(r.ownerId)?.phone ?? null,
    listingCount: countOf.get(r.id) ?? 0,
    ratingAverage: r.ratingAvg,
    ratingCount: r.ratingCount,
    ...(withDocuments
      ? { documentUrls: { id: signedFileUrl(r.idPhotoKey), selfie: signedFileUrl(r.selfieKey), proof: signedFileUrl(r.proofKey) } }
      : {}),
  }))
}
