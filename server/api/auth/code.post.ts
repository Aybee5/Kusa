import { eq } from 'drizzle-orm'
import { z } from 'zod'
import type { CodeSent } from '#shared/types/api'

const RESEND_SECONDS = 60
const Body = z.union([z.object({ email: z.string().max(254) }), z.object({ phone: z.string().max(20) })])

/**
 * POST /api/auth/code: send a 6-digit sign-in code by email ({ email }) or SMS
 * ({ phone }), whichever SIGNIN_METHODS allows. One code per minute per address.
 */
export default defineEventHandler(async (event): Promise<CodeSent> => {
  const target = signInTarget(await readValidatedBody(event, Body.parse))

  const db = useDb()
  const { otpCodes } = schema
  const [existing] = await db.select().from(otpCodes).where(eq(otpCodes.target, target.key)).limit(1)
  const wait = existing ? RESEND_SECONDS - Math.floor((Date.now() - existing.sentAt.getTime()) / 1000) : 0
  if (wait > 0) throw createError({ statusCode: 429, message: `Please wait ${wait} seconds before asking for another code` })

  const code = newOtpCode(target.method)
  const row = { target: target.key, codeHash: hashOtp(target.key, code), expiresAt: new Date(Date.now() + 10 * 60_000), attempts: 0, sentAt: new Date() }
  await db.insert(otpCodes).values(row).onConflictDoUpdate({ target: otpCodes.target, set: row })
  if (target.method === 'email') await sendSignInEmail(target.value, code)
  else await sendSignInCode(target.value, code)

  return { sent: true, retryAfter: RESEND_SECONDS, ...(codesAreLogged(target.method) ? { devCode: code } : {}) }
})
