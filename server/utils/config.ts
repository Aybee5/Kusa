import { normalizeNgPhone } from '#shared/utils/catalog'

/**
 * Server settings, read from environment variables at runtime (see
 * .env.example). Kept out of runtimeConfig so plain names like DATABASE_URL
 * work on any host.
 */
export function serverConfig() {
  const env = process.env
  const dev = import.meta.dev
  return {
    databaseUrl: env.DATABASE_URL ?? '',
    authSecret: env.AUTH_SECRET || (dev ? 'kusa-dev-secret-change-me' : ''),
    sessionDays: Number(env.SESSION_DAYS ?? 60),
    smsProvider: (env.SMS_PROVIDER ?? 'console') as 'console' | 'termii',
    /** Fixed code accepted by the console provider, for development and demos. */
    devOtpCode: env.DEV_OTP_CODE ?? '123456',
    termii: {
      apiKey: env.TERMII_API_KEY ?? '',
      senderId: env.TERMII_SENDER_ID ?? 'Kusa',
      baseUrl: env.TERMII_BASE_URL ?? 'https://api.ng.termii.com',
      channel: env.TERMII_CHANNEL ?? 'dnd',
    },
    adminPhones: (env.ADMIN_PHONES ?? '').split(',').map((p) => normalizeNgPhone(p)).filter((p): p is string => !!p),
    seedDemoData: env.SEED_DEMO_DATA ? env.SEED_DEMO_DATA === 'true' : dev,
    corsOrigins: (env.CORS_ORIGINS ?? 'capacitor://localhost,http://localhost,https://localhost').split(',').map((o) => o.trim()).filter(Boolean),
    s3: {
      bucket: env.S3_BUCKET ?? '',
      region: env.S3_REGION ?? 'auto',
      endpoint: env.S3_ENDPOINT ?? '',
      accessKeyId: env.S3_ACCESS_KEY_ID ?? '',
      secretAccessKey: env.S3_SECRET_ACCESS_KEY ?? '',
    },
    uploadsDir: env.UPLOADS_DIR ?? './.data/uploads',
  }
}

export function requireSecret(): string {
  const secret = serverConfig().authSecret
  if (!secret) throw createError({ statusCode: 500, statusMessage: 'AUTH_SECRET is not set on the server' })
  return secret
}
