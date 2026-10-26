import { storage } from '~/utils/storage'

/**
 * Counts a profile view when a vendor page opens in the browser or app, and
 * a unique visitor the first time this device opens it on a given day.
 */
export function useTrackView(vendorId: () => string | undefined, productId?: () => string | undefined) {
  const api = useApi()
  onMounted(async () => {
    const id = vendorId()
    if (!id) return
    const key = `kusa:visited:${id}`
    const today = todayLagos()
    const last = await storage.get(key)
    await api.recordEvent(id, 'view', { firstVisitToday: last !== today, productId: productId?.() })
    if (last !== today) await storage.set(key, today)
  })
}
