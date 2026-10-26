import type { KusaApi } from '~/services/api'
import { createHttpApi } from '~/services/http'
import { createMockApi, createMockDb, type MockDb } from '~/services/mock'

/** The backend. Demo data unless NUXT_PUBLIC_API_BASE is set. */
export function useApi(): KusaApi {
  const config = useRuntimeConfig()
  if (config.public.apiBase) {
    const token = useState<string | null>('kusa-token', () => null)
    return createHttpApi(config.public.apiBase, () => token.value)
  }
  const db = useState<MockDb>('kusa-db', createMockDb)
  return createMockApi(() => db.value)
}
