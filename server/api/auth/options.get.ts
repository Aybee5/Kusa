import type { SignInOptions } from '#shared/types/api'

/** GET /api/auth/options: which sign-in methods are on (email, phone), the first being the default. */
export default defineEventHandler((): SignInOptions => ({ methods: serverConfig().signinMethods }))
