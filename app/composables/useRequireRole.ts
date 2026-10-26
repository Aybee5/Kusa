import type { Role } from '~/types'

/**
 * Sends people who aren't signed in with the right role to sign in. Runs in
 * the browser once the saved session has loaded. The real backend must also
 * check the role on every request; this is only for the interface.
 */
export function useRequireRole(role: Role, fallback = '/signin') {
  const { user, ready } = useSession()
  const route = useRoute()
  watch(
    [ready, user],
    () => {
      if (!ready.value) return
      if (!user.value || user.value.role !== role) {
        navigateTo({ path: fallback, query: { redirect: route.fullPath } }, { replace: true })
      }
    },
    { immediate: true },
  )
  return { user, ready }
}
