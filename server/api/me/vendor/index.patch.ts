import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { CATEGORIES } from '#shared/utils/catalog'

const Time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use a time like 09:00')
const Body = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  category: z.enum(CATEGORIES.map((c) => c.id) as [string, ...string[]]).optional(),
  about: z.string().trim().max(600).optional(),
  area: z.string().trim().min(2).max(60).optional(),
  city: z.string().trim().min(2).max(60).optional(),
  landmark: z.string().trim().max(120).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  delivery: z.boolean().optional(),
  pickup: z.boolean().optional(),
  hours: z.object({
    opens: Time,
    closes: Time,
    closedDays: z.array(z.number().int().min(0).max(6)).max(6),
  }).refine((h) => h.closes > h.opens, { message: 'Closing time must be after opening time' }).optional(),
  phone: ContactFields.phone.optional(),
  whatsapp: ContactFields.whatsapp.optional(),
  instagram: ContactFields.instagram.optional(),
  showPhone: ContactFields.showPhone.optional(),
  primaryContact: ContactFields.primaryContact.optional(),
  coverImageKey: z.string().max(200).nullable().optional(),
  logoImageKey: z.string().max(200).nullable().optional(),
})

/**
 * PATCH /api/me/vendor: update the signed-in vendor's business: details,
 * contact buttons, opening hours, location, cover photo and logo. Send only
 * what changed; an image key of null removes that image.
 */
export default defineEventHandler(async (event) => {
  const { user, vendor } = await requireVendor(event)
  const body = await readValidatedBody(event, Body.parse)
  if ((body.lat === undefined) !== (body.lng === undefined)) throw createError({ statusCode: 400, message: 'Send both lat and lng' })
  for (const key of [body.coverImageKey, body.logoImageKey]) if (key) assertOwnKey(key, 'shop', user.id)

  const touchesContacts = ['phone', 'whatsapp', 'instagram', 'showPhone', 'primaryContact'].some((k) => k in body)
  const contacts = touchesContacts
    ? resolveContacts({
        phone: body.phone ?? vendor.phone,
        whatsapp: body.whatsapp !== undefined ? body.whatsapp : vendor.whatsapp,
        instagram: body.instagram !== undefined ? body.instagram : vendor.instagram,
        showPhone: body.showPhone ?? vendor.showPhone,
        primaryContact: body.primaryContact ?? vendor.primaryContact,
      })
    : {}
  const delivery = body.delivery ?? vendor.delivery
  const pickup = body.pickup ?? vendor.pickup
  if (!delivery && !pickup) throw createError({ statusCode: 400, message: 'Choose pickup, delivery or both' })

  const { hours, landmark, ...rest } = body
  const [row] = await useDb().update(schema.vendors).set({
    ...Object.fromEntries(Object.entries(rest).filter(([k, v]) => v !== undefined && !['phone', 'whatsapp', 'instagram', 'showPhone', 'primaryContact'].includes(k))),
    ...contacts,
    ...(landmark !== undefined ? { landmark: landmark || null } : {}),
    ...(hours ? { opens: hours.opens, closes: hours.closes, closedDays: [...new Set(hours.closedDays)].sort((a, b) => a - b) } : {}),
  }).where(eq(schema.vendors.id, vendor.id)).returning()
  return toVendor(row!, user.name)
})
