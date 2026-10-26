import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import { and, eq, gt } from 'drizzle-orm'
import type { H3Event } from 'h3'
import type { Role, SessionUser } from '#shared/types'
import type { UserRow } from '../database/schema'

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')
export const hmac = (s: string) => createHmac('sha256', requireSecret()).update(s).digest('base64url')

export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

export function newOtpCode(): string {
  const { smsProvider, devOtpCode } = serverConfig()
  return smsProvider === 'console' ? devOtpCode : String(randomInt(0, 1_000_000)).padStart(6, '0')
}
export const hashOtp = (phone: string, code: string) => hmac(`otp:${phone}:${code}`)

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + serverConfig().sessionDays * 86400000)
  await useDb().insert(schema.sessions).values({ tokenHash: sha256(token), userId, expiresAt })
  return token
}

function bearer(event: H3Event): string | null {
  const h = getHeader(event, 'authorization')
  return h?.startsWith('Bearer ') ? h.slice(7).trim() : null
}

/** The signed-in user, or null. Cached for the request. */
export async function getUser(event: H3Event): Promise<UserRow | null> {
  if (event.context.user !== undefined) return event.context.user as UserRow | null
  const token = bearer(event)
  let user: UserRow | null = null
  if (token) {
    const db = useDb()
    const [row] = await db
      .select({ user: schema.users })
      .from(schema.sessions)
      .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
      .where(and(eq(schema.sessions.tokenHash, sha256(token)), gt(schema.sessions.expiresAt, new Date())))
      .limit(1)
    user = row?.user ?? null
    if (user && Date.now() - user.lastActiveAt.getTime() > 3600_000) {
      db.update(schema.users).set({ lastActiveAt: new Date() }).where(eq(schema.users.id, user.id)).catch(() => {})
    }
  }
  event.context.user = user
  return user
}

export async function requireUser(event: H3Event): Promise<UserRow> {
  const user = await getUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Please sign in' })
  if (user.status === 'suspended') throw createError({ statusCode: 403, statusMessage: 'This account is suspended' })
  return user
}

export async function requireRole(event: H3Event, ...roles: Role[]): Promise<UserRow> {
  const user = await requireUser(event)
  if (!roles.includes(user.role)) throw createError({ statusCode: 403, statusMessage: 'You don’t have access to this' })
  return user
}

/** The signed-in vendor's user and business. */
export async function requireVendor(event: H3Event) {
  const user = await requireRole(event, 'vendor')
  const [vendor] = await useDb().select().from(schema.vendors).where(eq(schema.vendors.ownerId, user.id)).limit(1)
  if (!vendor) throw createError({ statusCode: 404, statusMessage: 'Register your business first' })
  return { user, vendor }
}

export async function toSessionUser(user: UserRow): Promise<SessionUser> {
  let vendorId: string | undefined
  if (user.role === 'vendor') {
    const [v] = await useDb().select({ id: schema.vendors.id }).from(schema.vendors).where(eq(schema.vendors.ownerId, user.id)).limit(1)
    vendorId = v?.id
  }
  return { id: user.id, name: user.name, phone: user.phone, role: user.role, vendorId }
}
