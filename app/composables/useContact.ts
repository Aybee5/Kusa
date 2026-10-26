import { Capacitor } from '@capacitor/core'
import { Share } from '@capacitor/share'
import type { Vendor } from '#shared/types'

/** WhatsApp, call, directions and share actions, each counted in the vendor's stats. */
export function useContact() {
  const api = useApi()
  const config = useRuntimeConfig()
  const toast = useToast()

  const whatsappUrl = (v: Vendor, productName?: string) => {
    const text = productName
      ? `Hello ${v.name}, I found your "${productName}" on Kusa. Is it available?`
      : `Hello ${v.name}, I found you on Kusa.`
    return `https://wa.me/${v.whatsapp}?text=${encodeURIComponent(text)}`
  }
  const callUrl = (v: Vendor) => `tel:${v.phone}`
  const directionsUrl = (v: Vendor) => `https://www.google.com/maps/dir/?api=1&destination=${v.lat},${v.lng}`

  const track = (v: Vendor, event: 'whatsapp' | 'call' | 'directions') => api.recordEvent(v.id, event)

  async function share(title: string, path: string) {
    const url = `${config.public.siteUrl}${path}${path.includes('?') ? '&' : '?'}ref=share`
    try {
      if (Capacitor.isNativePlatform()) await Share.share({ title, url, dialogTitle: 'Share' })
      else if (navigator.share) await navigator.share({ title, url })
      else {
        await navigator.clipboard.writeText(url)
        toast.show('Link copied')
      }
    } catch {
      /* share sheet closed */
    }
  }

  return { whatsappUrl, callUrl, directionsUrl, track, share }
}
