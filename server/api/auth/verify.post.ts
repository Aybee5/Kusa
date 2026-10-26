import { eq } from 'drizzle-orm'
import { z } from 'zod'
import type { AuthResult } from '#shared/types/api'
import { normalizeNgPhone } from '#shared/utils/catalog'

const MAX_ATTEMPTS = 5
const Body = z.object({
  phone: z.string().max(20),
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
  name: z.string().trim().max(60).optional(),
})
const TINTS = ['#E3F1EA', '#E4E1F2', '#FBE7D9', '#F4ECC4', '#EFE0EC', '#D9EBE6', '#F1D3DA']

/** POST /api/auth/verify: check the code, create the account if new, return a session token. */
export default defineEventHandler(async (event): Promise<AuthResult> => {
  const body = await readValidatedBody(event, Body.parse)
  const phone = normalizeNgPhone(body.phone)
  if (!phone) throw createError({ statusCode: 400, statusMessage: 'Enter a Nigerian mobile number' })

  const db = useDb()
  const { otpCodes, users } = schema
  const [otp] = await db.select().from(otpCodes).where(eq(otpCodes.phone, phone)).limit(1)
  if (!otp || otp.expiresAt < new Date()) throw createError({ statusCode: 400, statusMessage: 'That code has expired. Ask for a new one.' })
  if (otp.attempts >= MAX_ATTEMPTS) throw createError({ statusCode: 429, statusMessage: 'Too many tries. Ask for a new code.' })
  if (!safeEqual(otp.codeHash, hashOtp(phone, body.code))) {
    await db.update(otpCodes).set({ attempts: otp.attempts + 1 }).where(eq(otpCodes.phone, phone))
    throw createError({ statusCode: 400, statusMessage: 'That code is not right' })
  }
  await db.delete(otpCodes).where(eq(otpCodes.phone, phone))

  const isAdmin = serverConfig().adminPhones.includes(phone)
  let [user] = await db.select().from(users).where(eq(users.phone, phone)).limit(1)
  if (!user) {
    ;[user] = await db.insert(users).values({
      phone,
      name: body.name || '',
      role: isAdmin ? 'admin' : 'shopper',
      tint: TINTS[Math.floor(Math.random() * TINTS.length)]!,
    }).returning()
  } else {
    const changes: Partial<typeof users.$inferInsert> = { lastActiveAt: new Date() }
    if (isAdmin && user.role !== 'admin') changes.role = 'admin'
    if (body.name && !user.name) changes.name = body.name
    ;[user] = await db.update(users).set(changes).where(eq(users.id, user.id)).returning()
  }
  if (user!.status === 'suspended') {
    throw createError({ statusCode: 403, statusMessage: 'This account is suspended. Contact support@kusa.ng if you think this is a mistake.' })
  }
  return { token: await createSession(user!.id), user: await toSessionUser(user!) }
})
