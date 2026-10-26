import type { SessionUser } from '~/types'
import { storage } from '~/utils/storage'

const KEY = 'kusa:session'

export function useSession() {
  const user = useState<SessionUser | null>('kusa-user', () => null)
  const ready = useState<boolean>('kusa-user-ready', () => false)

  async function load() {
    if (ready.value) return
    user.value = await storage.getJSON<SessionUser>(KEY)
    ready.value = true
  }

  async function signIn(u: SessionUser) {
    user.value = u
    await storage.setJSON(KEY, u)
  }

  async function signOut() {
    user.value = null
    await storage.remove(KEY)
  }

  return { user, ready, load, signIn, signOut }
}
