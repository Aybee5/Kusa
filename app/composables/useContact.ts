import { Capacitor } from '@capacitor/core'
import { Share } from '@capacitor/share'
import type { Vendor } from '#shared/types'

/** WhatsApp, Instagram, call, directions and share actions, each counted in the vendor's stats. */
export function useContact() {
  const api = useApi()
  const config = useRuntimeConfig()
  const toast = useToast()

  const message = (v: Pick<Vendor, 'name'>, productName?: string) => productName
    ? `Hello ${v.name}, I found your "${productName}" on Kusa. Is it available?`
    : `Hello ${v.name}, I found you on Kusa.`
  const whatsappUrl = (v: Pick<Vendor, 'name' | 'whatsapp'>, productName?: string) =>
    `https://wa.me/${v.whatsapp}?text=${encodeURIComponent(message(v, productName))}`
  /** Opens a direct message in the Instagram app (or the website). */
  const instagramUrl = (v: Pick<Vendor, 'instagram'>) => `https://ig.me/m/${v.instagram}`
  const callUrl = (v: Pick<Vendor, 'phone'>) => `tel:${v.phone}`
  const directionsUrl = (v: Pick<Vendor, 'lat' | 'lng'>) => `https://www.google.com/maps/dir/?api=1&destination=${v.lat},${v.lng}`

  const track = (v: Pick<Vendor, 'id'>, event: 'whatsapp' | 'instagram' | 'call' | 'directions') => api.recordEvent(v.id, event)

  /** Instagram can't pre-fill a message, so copy it for the shopper to paste. */
  async function copyMessage(v: Pick<Vendor, 'name'>, productName: string) {
    try {
      await navigator.clipboard.writeText(message(v, productName))
      toast.show('Order message copied. Paste it in the Instagram chat.')
    } catch {
      /* clipboard not allowed; Instagram still opens */
    }
  }

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

  return { message, whatsappUrl, instagramUrl, callUrl, directionsUrl, track, copyMessage, share }
}
