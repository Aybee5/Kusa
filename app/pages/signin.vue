<script setup lang="ts">
definePageMeta({ layout: 'bare' })

const route = useRoute()
const api = useApi()
const session = useSession()
const config = useRuntimeConfig()
const showDemo = config.public.showDemoAccounts || import.meta.dev

const step = ref<'phone' | 'code'>('phone')
const phone = ref('')
const code = ref('')
const devCode = ref<string | null>(null)
const busy = ref(false)
const error = ref<string | null>(null)

const digits = computed(() => phone.value.replace(/\D/g, '').replace(/^234/, '').replace(/^0/, ''))
const valid = computed(() => digits.value.length === 10)
const redirect = computed(() => (typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/') ? route.query.redirect : null))

async function sendCode() {
  if (!valid.value) return
  busy.value = true
  error.value = null
  try {
    const res = await api.requestCode(`+234${digits.value}`)
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
    const { user, token } = await api.verifyCode(`+234${digits.value}`, code.value)
    await session.signIn(user, token)
    const home = user.role === 'admin' ? '/admin' : user.role === 'vendor' ? '/vendor' : '/account'
    await navigateTo(redirect.value ?? home, { replace: true })
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

function useDemo(number: string) {
  phone.value = number
  step.value = 'phone'
  error.value = null
}

useSeoMeta({ title: 'Sign in · Kusa', robots: 'noindex' })
</script>

<template>
  <div class="flex min-h-dvh flex-col gap-5 px-5 pb-8 pt-2.5 lg:min-h-0 lg:p-8">
    <NuxtLink :to="redirect ?? '/'" aria-label="Close" class="-ml-2.5 flex size-11 items-center justify-center text-ink lg:hidden"><AppIcon name="x" :size="24" /></NuxtLink>

    <div class="flex flex-col gap-1.5">
      <h1 class="font-display text-[28px] font-extrabold leading-tight tracking-tight">{{ step === 'phone' ? 'Sign in with your phone' : 'Enter the code' }}</h1>
      <p class="text-sm text-muted">
        {{ step === 'phone' ? 'We’ll text you a 6-digit code. No password needed.' : `We sent it to +234 ${digits}.` }}
      </p>
    </div>

    <form v-if="step === 'phone'" class="flex flex-col gap-4" @submit.prevent="sendCode">
      <div class="flex flex-col gap-1.5">
        <label for="phone" class="label">Phone number</label>
        <div class="flex h-[52px] items-center overflow-hidden rounded-2xl border-[1.5px] border-line bg-surface focus-within:border-palm">
          <span class="pl-3.5 pr-1.5 text-base font-semibold text-muted">+234</span>
          <input id="phone" v-model="phone" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="803 000 0000" class="h-12 min-w-0 flex-1 bg-transparent text-base outline-none" />
        </div>
      </div>
      <p v-if="error" class="text-sm text-danger-ink" role="alert">{{ error }}</p>
      <button type="submit" class="btn-dark h-[54px] text-base" :disabled="!valid || busy">{{ busy ? 'Sending…' : 'Send code' }}</button>
    </form>

    <form v-else class="flex flex-col gap-4" @submit.prevent="verify">
      <div class="flex flex-col gap-1.5">
        <label for="code" class="label">6-digit code</label>
        <input id="code" v-model="code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••" class="field h-[52px] text-center text-2xl tracking-[0.4em]" />
      </div>
      <p v-if="devCode" class="rounded-xl bg-amber-tint px-3 py-2 text-[13px] text-[#5C3B00]">Development mode: no SMS was sent. Your code is <strong>{{ devCode }}</strong>.</p>
      <p v-if="error" class="text-sm text-danger-ink" role="alert">{{ error }}</p>
      <button type="submit" class="btn-dark h-[54px] text-base" :disabled="code.length !== 6 || busy">{{ busy ? 'Checking…' : 'Sign in' }}</button>
      <button type="button" class="min-h-11 cursor-pointer text-sm font-bold text-palm" @click="step = 'phone'; code = ''">Use a different number</button>
    </form>

    <div v-if="showDemo" class="mt-auto rounded-2xl border border-dashed border-[#C9C2B3] p-4 text-[13px] text-ink-2 lg:mt-4">
      <p class="font-bold">Demo accounts</p>
      <div class="mt-2 flex flex-wrap gap-2">
        <button type="button" class="h-9 cursor-pointer rounded-full bg-sand px-3 font-semibold" @click="useDemo('8130000954')">Shopper · Aisha</button>
        <button type="button" class="h-9 cursor-pointer rounded-full bg-sand px-3 font-semibold" @click="useDemo('8030004417')">Vendor · Mama Hadiza</button>
        <button type="button" class="h-9 cursor-pointer rounded-full bg-sand px-3 font-semibold" @click="useDemo('8000000001')">Admin</button>
      </div>
    </div>
  </div>
</template>
