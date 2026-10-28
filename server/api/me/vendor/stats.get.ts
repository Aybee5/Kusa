import { and, eq, gte, inArray, sql } from 'drizzle-orm'
import type { DailyStat, VendorStats } from '#shared/types'
import { todayLagos } from '#shared/utils/catalog'

const SOURCE_LABELS: Record<string, string> = {
  search: 'Browsing and search on Kusa',
  map: 'Nearby map',
  share: 'Shared links (WhatsApp, Instagram)',
  external: 'Google and other sites',
  direct: 'Saved or typed the link',
  ad: 'Your promotions on Kusa',
}

/** GET /api/me/vendor/stats: the last 60 days of traffic, sources and product views (last 30 days). */
export default defineEventHandler(async (event): Promise<VendorStats> => {
  const { vendor } = await requireVendor(event)
  const db = useDb()
  const { vendorDailyStats: s, vendorSourceStats: src, productDailyViews: pv, products } = schema

  const today = todayLagos()
  const dayList = Array.from({ length: 60 }, (_, i) => {
    const d = new Date(`${today}T12:00:00Z`)
    d.setUTCDate(d.getUTCDate() - (59 - i))
    return d.toISOString().slice(0, 10)
  })
  const from60 = dayList[0]!
  const from30 = dayList[30]!

  const [daily, sources, views] = await Promise.all([
    db.select().from(s).where(and(eq(s.vendorId, vendor.id), gte(s.day, from60))),
    db.select({ source: src.source, views: sql<number>`sum(${src.views})::int` }).from(src)
      .where(and(eq(src.vendorId, vendor.id), gte(src.day, from30))).groupBy(src.source),
    db.select({ productId: pv.productId, views: sql<number>`sum(${pv.views})::int` }).from(pv)
      .where(and(gte(pv.day, from30), inArray(pv.productId, db.select({ id: products.id }).from(products).where(eq(products.vendorId, vendor.id)))))
      .groupBy(pv.productId),
  ])

  const byDay = new Map(daily.map((d) => [d.day, d]))
  const days: DailyStat[] = dayList.map((date) => {
    const d = byDay.get(date)
    return { date, views: d?.views ?? 0, visitors: d?.visitors ?? 0, whatsapp: d?.whatsapp ?? 0, instagram: d?.instagram ?? 0, calls: d?.calls ?? 0, directions: d?.directions ?? 0 }
  })
  const totalSource = sources.reduce((a, r) => a + r.views, 0)
  return {
    vendorId: vendor.id,
    daily: days,
    sources: totalSource
      ? sources.sort((a, b) => b.views - a.views).map((r) => ({ label: SOURCE_LABELS[r.source] ?? r.source, share: r.views / totalSource }))
      : [],
    productViews: Object.fromEntries(views.map((v) => [v.productId, v.views])),
  }
})
