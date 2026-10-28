import { z } from 'zod'
import type { ContactChannel } from '#shared/types'
import type { ContactInput } from '#shared/types/api'
import { normalizeInstagram, normalizeNgPhone } from '#shared/utils/catalog'

export const ContactFields = {
  phone: z.string().max(20),
  whatsapp: z.string().max(20).nullable(),
  instagram: z.string().max(100).nullable(),
  showPhone: z.boolean(),
  primaryContact: z.enum(['whatsapp', 'instagram', 'phone']),
}

/**
 * Normalise and check how shoppers reach a business: a business phone is
 * required; WhatsApp and Instagram are optional; at least one button must be
 * shown, and the main button must be one of them.
 */
export function resolveContacts(input: ContactInput) {
  const phone = normalizeNgPhone(input.phone)
  if (!phone) throw createError({ statusCode: 400, message: 'Enter your business phone number, e.g. 0803 000 0000' })
  let whatsapp: string | null = null
  if (input.whatsapp?.trim()) {
    const wa = normalizeNgPhone(input.whatsapp)
    if (!wa) throw createError({ statusCode: 400, message: 'Enter a Nigerian WhatsApp number, or leave it empty' })
    whatsapp = wa.slice(1)
  }
  let instagram: string | null = null
  if (input.instagram?.trim()) {
    instagram = normalizeInstagram(input.instagram)
    if (!instagram) throw createError({ statusCode: 400, message: 'Enter your Instagram username, e.g. @mamahadiza' })
  }
  const on: Record<ContactChannel, boolean> = { whatsapp: !!whatsapp, instagram: !!instagram, phone: input.showPhone }
  if (!on.whatsapp && !on.instagram && !on.phone) throw createError({ statusCode: 400, message: 'Give shoppers at least one way to reach you' })
  if (!on[input.primaryContact]) throw createError({ statusCode: 400, message: 'Your main button must be one you’ve added' })
  return { phone, whatsapp, instagram, showPhone: input.showPhone, primaryContact: input.primaryContact }
}
