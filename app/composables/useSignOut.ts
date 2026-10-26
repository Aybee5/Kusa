/** Ends the session on the server and forgets it on this device. */
export function useSignOut() {
  const api = useApi()
  const session = useSession()
  return async (redirect = '/') => {
    await api.signOut()
    await session.clear()
    await navigateTo(redirect)
  }
}
