import type { SignInMethod } from '#shared/types/api'
import type { SignInTo } from '~/services/api'

/**
 * The email-or-phone part of signing in. Which methods are on comes from the
 * server (SIGNIN_METHODS); the first is shown first and the others are offered
 * as "Use … instead".
 */
export async function useSignInForm() {
  const api = useApi()
  const { data: options } = await useAsyncData('signin-options', () => api.signInOptions().catch(() => ({ methods: ['email'] as SignInMethod[] })), {
    getCachedData: (key, nuxtApp) => nuxtApp.payload.data[key] ?? nuxtApp.static.data[key],
  })
  const methods = computed<SignInMethod[]>(() => options.value?.methods ?? ['email'])
  const method = ref<SignInMethod>(methods.value[0] ?? 'email')
  watch(methods, (m) => {
    if (!m.includes(method.value)) method.value = m[0] ?? 'email'
  })
  const other = computed(() => methods.value.find((m) => m !== method.value) ?? null)

  const email = ref('')
  const phone = ref('')
  const digits = computed(() => phone.value.replace(/\D/g, '').replace(/^234/, '').replace(/^0/, ''))
  const valid = computed(() => (method.value === 'email' ? !!normalizeEmail(email.value) : /^[789][01]\d{8}$/.test(digits.value)))
  const to = computed<SignInTo>(() => (method.value === 'email' ? { email: email.value.trim() } : { phone: `+234${digits.value}` }))
  /** Where the code went, for "We sent it to …". */
  const shown = computed(() => (method.value === 'email' ? email.value.trim().toLowerCase() : `+234 ${digits.value}`))

  return { methods, method, other, email, phone, digits, valid, to, shown }
}
