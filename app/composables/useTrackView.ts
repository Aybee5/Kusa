import type { TrafficSourceKey } from '#shared/types/api'
import { storage } from '~/utils/storage'

/** How the shopper got to this page, for the vendor's "How shoppers found you". */
function trafficSource(route: ReturnType<typeof useRoute>): TrafficSourceKey {
  if (route.query.from === 'map') return 'map'
  if (route.query.from === 'ad') return 'ad'
  if (route.query.ref === 'share') return 'share'
  if (window.history.state?.back) return 'search' // moved here inside Kusa
  const ref = document.referrer
  if (ref && !ref.startsWith(window.location.origin)) {
    return /whatsapp|wa\.me|facebook|instagram|t\.co|twitter|x\.com|tiktok|telegram/i.test(ref) ? 'share' : 'external'
  }
  return 'direct'
}

/**
 * Counts a profile view when a vendor or product page opens, and a unique
 * visitor the first time this device opens that vendor on a given day.
 */
export function useTrackView(vendorId: () => string | undefined, productId?: () => string | undefined) {
  const api = useApi()
  const route = useRoute()
  onMounted(async () => {
    const id = vendorId()
    if (!id) return
    const key = `kusa:visited:${id}`
    const today = todayLagos()
    const last = await storage.get(key)
    await api.recordEvent(id, 'view', { firstVisitToday: last !== today, productId: productId?.(), source: trafficSource(route) })
    if (last !== today) await storage.set(key, today)
  })
}
