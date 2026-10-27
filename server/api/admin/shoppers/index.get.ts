import { desc, eq, sql } from 'drizzle-orm'
import type { AdminShopper } from '#shared/types/api'
import { initialsOf } from '#shared/utils/catalog'

/** GET /api/admin/shoppers: shopper accounts with their rating and flag counts. */
export default defineEventHandler(async (event): Promise<AdminShopper[]> => {
  await requireRole(event, 'admin')
  const { users, reviews } = schema
  const rows = await useDb()
    .select({
      u: users,
      ratingCount: sql<number>`count(${reviews.id})::int`,
      flagCount: sql<number>`count(${reviews.id}) filter (where ${reviews.status} <> 'published')::int`,
    })
    .from(users)
    .leftJoin(reviews, eq(reviews.userId, users.id))
    .where(eq(users.role, 'shopper'))
    .groupBy(users.id)
    .orderBy(desc(users.lastActiveAt))
    .limit(1000)
  return rows.map(({ u, ratingCount, flagCount }) => ({
    id: u.id,
    name: u.name || 'No name yet',
    phone: u.phone,
    email: u.email,
    area: u.area || '–',
    joinedAt: u.createdAt.toISOString().slice(0, 10),
    lastActiveAt: u.lastActiveAt.toISOString().slice(0, 10),
    status: u.status,
    suspensionReason: u.suspensionReason ?? undefined,
    initials: initialsOf(u.name || 'S'),
    tint: u.tint,
    ratingCount,
    flagCount,
  }))
})
