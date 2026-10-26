import type { KusaApi } from '~/services/api'
import { createHttpApi } from '~/services/http'

/** The Kusa API client, signed in when the shopper, vendor or admin is. */
export function useApi(): KusaApi {
  const config = useRuntimeConfig()
  const session = useSession()
  const nuxtApp = useNuxtApp()
  return createHttpApi({
    baseURL: config.public.apiBase,
    getToken: session.getToken,
    onUnauthorized: () => {
      // The session ended (signed out elsewhere or suspended).
      session.clear().then(() => nuxtApp.runWithContext(() => useToast().show('Please sign in again')))
    },
  })
}

/** Turn an API file path (/api/files/…) into a URL that also works inside the native apps. */
export function useAssetUrl() {
  const base = useRuntimeConfig().public.apiBase
  const origin = /^https?:\/\//.test(base) ? new URL(base).origin : ''
  return (src?: string | null) => (src && src.startsWith('/api/') ? `${origin}${src}` : src ?? undefined)
}
