import { eq } from 'drizzle-orm'
import { z } from 'zod'
import type { CodeSent } from '#shared/types/api'
import { normalizeNgPhone } from '#shared/utils/catalog'

const RESEND_SECONDS = 60
const Body = z.object({ phone: z.string().max(20) })

/** POST /api/auth/code: text a 6-digit sign-in code (one per minute per number). */
export default defineEventHandler(async (event): Promise<CodeSent> => {
  const phone = normalizeNgPhone((await readValidatedBody(event, Body.parse)).phone)
  if (!phone) throw createError({ statusCode: 400, statusMessage: 'Enter a Nigerian mobile number, e.g. 0803 000 0000' })

  const db = useDb()
  const { otpCodes } = schema
  const [existing] = await db.select().from(otpCodes).where(eq(otpCodes.phone, phone)).limit(1)
  const wait = existing ? RESEND_SECONDS - Math.floor((Date.now() - existing.sentAt.getTime()) / 1000) : 0
  if (wait > 0) throw createError({ statusCode: 429, statusMessage: `Please wait ${wait} seconds before asking for another code` })

  const code = newOtpCode()
  const row = { phone, codeHash: hashOtp(phone, code), expiresAt: new Date(Date.now() + 10 * 60_000), attempts: 0, sentAt: new Date() }
  await db.insert(otpCodes).values(row).onConflictDoUpdate({ target: otpCodes.phone, set: row })
  await sendSignInCode(phone, code)

  const { smsProvider } = serverConfig()
  return { sent: true, retryAfter: RESEND_SECONDS, ...(smsProvider === 'console' ? { devCode: code } : {}) }
})
