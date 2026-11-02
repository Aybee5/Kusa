import { eq, like } from 'drizzle-orm'
import { z } from 'zod'
import { CATEGORIES, slugify } from '#shared/utils/catalog'
import { guessState, STATE_NAMES } from '#shared/utils/states'

const Body = z.object({
  name: z.string().trim().min(2).max(80),
  category: CategoryField,
  ...ContactFields,
  area: z.string().trim().min(2, 'Enter your area or neighbourhood').max(60),
  city: z.string().trim().min(2).max(60).default('Kano'),
  state: z.enum(STATE_NAMES).optional(),
  landmark: z.string().trim().max(120).default(''),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  delivery: z.boolean(),
  pickup: z.boolean(),
}).refine((b) => b.delivery || b.pickup, { message: 'Choose pickup, delivery or both' })

const COVER: Record<string, string> = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.tint]))

/** POST /api/me/vendor: register a business. The account becomes a vendor account; the business waits for verification. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  if (user.role === 'admin') throw createError({ statusCode: 400, message: 'Admin accounts can’t own a business' })
  const body = await readValidatedBody(event, Body.parse)
  const contacts = resolveContacts(body)

  const db = useDb()
  const { vendors, users } = schema
  const [already] = await db.select({ id: vendors.id }).from(vendors).where(eq(vendors.ownerId, user.id)).limit(1)
  if (already) throw createError({ statusCode: 409, message: 'You’ve already registered a business' })

  const base = slugify(body.name)
  const taken = new Set((await db.select({ slug: vendors.slug }).from(vendors).where(like(vendors.slug, `${base}%`))).map((r) => r.slug))
  let slug = base
  for (let i = 2; taken.has(slug); i++) slug = `${base}-${i}`

  const vendor = await db.transaction(async (tx) => {
    const [v] = await tx.insert(vendors).values({
      ownerId: user.id, slug, name: body.name, category: body.category, ...contacts,
      area: body.area, city: body.city, state: body.state ?? guessState(body), landmark: body.landmark || null,
      lat: body.lat, lng: body.lng, delivery: body.delivery, pickup: body.pickup, coverTint: COVER[body.category] ?? '#F6E3C8',
    }).returning()
    const [u] = await tx.update(users).set({ role: 'vendor' }).where(eq(users.id, user.id)).returning()
    return { v: v!, u: u! }
  })
  return { vendor: toVendor(vendor.v, vendor.u.name), user: await toSessionUser(vendor.u) }
})
