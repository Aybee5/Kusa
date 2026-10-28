<script setup lang="ts">
definePageMeta({ layout: 'bare' })

const route = useRoute()
const api = useApi()
const session = useSession()
const config = useRuntimeConfig()
const showDemo = config.public.showDemoAccounts || import.meta.dev

const step = ref<'start' | 'code'>('start')
const { method, other, email, phone, valid, to, shown } = await useSignInForm()
const code = ref('')
const devCode = ref<string | null>(null)
const busy = ref(false)
const error = ref<string | null>(null)

const redirect = computed(() => (typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/') ? route.query.redirect : null))

async function sendCode() {
  if (!valid.value) return
  busy.value = true
  error.value = null
  try {
    const res = await api.requestCode(to.value)
    devCode.value = res.devCode ?? null
    step.value = 'code'
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

async function verify() {
  busy.value = true
  error.value = null
  try {
    const { user, token } = await api.verifyCode(to.value, code.value)
    await session.signIn(user, token)
    const home = user.role === 'admin' ? '/admin' : user.role === 'vendor' ? '/vendor' : '/account'
    await navigateTo(redirect.value ?? home, { replace: true })
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

// Demo accounts by email and phone, so the buttons work whichever method is on.
const DEMO = [
  { label: 'Shopper · Aisha', email: 'aisha@demo.kusa.ng', phone: '8130000954' },
  { label: 'Vendor · Mama Hadiza', email: 'mama-hadiza-small-chops@demo.kusa.ng', phone: '8030004417' },
  { label: 'Admin', email: 'admin@demo.kusa.ng', phone: '8000000001' },
]
function useDemo(d: (typeof DEMO)[number]) {
  email.value = d.email
  phone.value = d.phone
  step.value = 'start'
  error.value = null
}

function switchMethod() {
  if (!other.value) return
  method.value = other.value
  error.value = null
}

useSeoMeta({ title: 'Sign in · Kusa', robots: 'noindex' })
</script>

<template>
  <div class="flex min-h-dvh flex-col gap-5 px-5 pb-8 pt-2.5 lg:min-h-0 lg:p-8">
    <NuxtLink :to="redirect ?? '/'" aria-label="Close" class="-ml-2.5 flex size-11 items-center justify-center text-ink lg:hidden"><AppIcon name="x" :size="24" /></NuxtLink>

    <div class="flex flex-col gap-1.5">
      <h1 class="font-display text-[28px] font-extrabold leading-tight tracking-tight">{{ step === 'code' ? 'Enter the code' : method === 'email' ? 'Sign in with your email' : 'Sign in with your phone' }}</h1>
      <p class="text-sm text-muted">
        {{ step === 'code' ? `We sent it to ${shown}.` : method === 'email' ? 'We’ll email you a 6-digit code. No password needed.' : 'We’ll text you a 6-digit code. No password needed.' }}
      </p>
    </div>

    <form v-if="step === 'start'" class="flex flex-col gap-4" @submit.prevent="sendCode">
      <SignInField v-model:email="email" v-model:phone="phone" :method="method" />
      <p v-if="error" class="text-sm text-danger-ink" role="alert">{{ error }}</p>
      <button type="submit" class="btn-dark h-[54px] text-base" :disabled="!valid || busy">{{ busy ? 'Sending…' : 'Send code' }}</button>
      <button v-if="other" type="button" class="min-h-11 cursor-pointer text-sm font-bold text-palm" @click="switchMethod">{{ other === 'email' ? 'Use email instead' : 'Use phone number instead' }}</button>
    </form>

    <form v-else class="flex flex-col gap-4" @submit.prevent="verify">
      <div class="flex flex-col gap-1.5">
        <label for="code" class="label">6-digit code</label>
        <input id="code" v-model="code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••" class="field h-[52px] text-center text-2xl tracking-[0.4em]" />
      </div>
      <p v-if="devCode" class="rounded-xl bg-amber-tint px-3 py-2 text-[13px] text-[#5C3B00]">Development mode: no {{ method === 'email' ? 'email' : 'SMS' }} was sent. Your code is <strong>{{ devCode }}</strong>.</p>
      <p v-else-if="method === 'email'" class="text-[13px] text-muted">Can’t find it? Check your spam or promotions folder.</p>
      <p v-if="error" class="text-sm text-danger-ink" role="alert">{{ error }}</p>
      <button type="submit" class="btn-dark h-[54px] text-base" :disabled="code.length !== 6 || busy">{{ busy ? 'Checking…' : 'Sign in' }}</button>
      <button type="button" class="min-h-11 cursor-pointer text-sm font-bold text-palm" @click="step = 'start'; code = ''">{{ method === 'email' ? 'Use a different email' : 'Use a different number' }}</button>
    </form>

    <div v-if="showDemo" class="mt-auto rounded-2xl border border-dashed border-[#C9C2B3] p-4 text-[13px] text-ink-2 lg:mt-4">
      <p class="font-bold">Demo accounts</p>
      <div class="mt-2 flex flex-wrap gap-2">
        <button v-for="d in DEMO" :key="d.label" type="button" class="h-9 cursor-pointer rounded-full bg-sand px-3 font-semibold" @click="useDemo(d)">{{ d.label }}</button>
      </div>
    </div>
  </div>
</template>
