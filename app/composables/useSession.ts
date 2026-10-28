import type { SessionUser } from '#shared/types'
import { storage } from '~/utils/storage'

const KEY = 'kusa:session'
interface Stored { user: SessionUser; token: string }

// Read once per app start. Requests can use the token straight away, while the
// reactive user state is applied after the first render (see the plugin).
let stored: Promise<Stored | null> | null = null
const readStored = () => (stored ??= storage.getJSON<Stored>(KEY).then((s) => (s?.token && s.user ? s : null)))

export function useSession() {
  const user = useState<SessionUser | null>('kusa-user', () => null)
  const token = useState<string | null>('kusa-token', () => null)
  const ready = useState<boolean>('kusa-user-ready', () => false)

  async function load() {
    const s = await readStored()
    user.value = s?.user ?? null
    token.value = s?.token ?? null
    ready.value = true
  }

  async function getToken(): Promise<string | null> {
    if (import.meta.server) return null
    if (ready.value) return token.value
    return (await readStored())?.token ?? null
  }

  async function signIn(u: SessionUser, t: string) {
    user.value = u
    token.value = t
    stored = Promise.resolve({ user: u, token: t })
    await storage.setJSON(KEY, { user: u, token: t })
  }

  /** Keep the token, update the user (e.g. after becoming a vendor). */
  async function update(u: SessionUser) {
    if (token.value) await signIn(u, token.value)
  }

  async function clear() {
    user.value = null
    token.value = null
    stored = Promise.resolve(null)
    await storage.remove(KEY)
  }

  return { user, token, ready, load, getToken, signIn, update, clear }
}
