import type { ContactChannel, Vendor } from '#shared/types'
import type { ContactInput } from '#shared/types/api'

/** Contact settings while they're being edited (local phone digits, on/off switches). */
export interface ContactDraft {
  phone: string
  whatsappOn: boolean
  whatsapp: string
  instagramOn: boolean
  instagram: string
  showPhone: boolean
  primaryContact: ContactChannel
}

const local = (n: string | null | undefined) => (n ?? '').replace(/\D/g, '').replace(/^234/, '').replace(/^0/, '')
const okPhone = (n: string) => /^[789][01]\d{8}$/.test(local(n))

export function newContactDraft(phone = ''): ContactDraft {
  return { phone: local(phone), whatsappOn: true, whatsapp: '', instagramOn: false, instagram: '', showPhone: true, primaryContact: 'whatsapp' }
}

export function contactDraftFrom(v: Pick<Vendor, 'phone' | 'whatsapp' | 'instagram' | 'showPhone' | 'primaryContact'>): ContactDraft {
  return {
    phone: local(v.phone),
    whatsappOn: !!v.whatsapp,
    whatsapp: local(v.whatsapp) === local(v.phone) ? '' : local(v.whatsapp),
    instagramOn: !!v.instagram,
    instagram: v.instagram ?? '',
    showPhone: v.showPhone,
    primaryContact: v.primaryContact,
  }
}

/** For the API. An empty WhatsApp number means "same as the business phone". */
export function contactInput(d: ContactDraft): ContactInput {
  return {
    phone: `+234${local(d.phone)}`,
    whatsapp: d.whatsappOn ? `+234${local(d.whatsapp) || local(d.phone)}` : null,
    instagram: d.instagramOn ? d.instagram.trim() : null,
    showPhone: d.showPhone,
    primaryContact: d.primaryContact,
  }
}

/** What's still missing, or '' when it's ready to save. */
export function contactProblem(d: ContactDraft): string {
  if (!okPhone(d.phone)) return 'Add your business phone number'
  if (d.whatsappOn && d.whatsapp.trim() && !okPhone(d.whatsapp)) return 'Check your WhatsApp number'
  if (d.instagramOn && !normalizeInstagram(d.instagram)) return 'Add your Instagram username'
  if (!d.whatsappOn && !d.instagramOn && !d.showPhone) return 'Turn on at least one way to reach you'
  const on = { whatsapp: d.whatsappOn, instagram: d.instagramOn, phone: d.showPhone }
  if (!on[d.primaryContact]) return 'Choose your main button'
  return ''
}
