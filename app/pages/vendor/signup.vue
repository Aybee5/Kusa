<script setup lang="ts">
import type { CategoryId } from '~/types'

definePageMeta({ layout: 'bare' })

const route = useRoute()
const api = useApi()
const session = useSession()
const { location, locate, locating } = useLocation()

const step = ref<1 | 2 | 3>(1)
const busy = ref(false)
const error = ref<string | null>(null)

// Step 1: account
const ownerName = ref('')
const phone = ref('')
const code = ref('')
const codeSent = ref(false)
const digits = computed(() => phone.value.replace(/\D/g, '').replace(/^234/, '').replace(/^0/, ''))

// Step 2: business
const biz = reactive({ name: '', category: 'small-chops' as CategoryId, whatsapp: '', landmark: '', delivery: true, pickup: true })
const pinned = ref(false)

// Step 3: verification
const idTypes = ['NIN slip', "Voter's card", "Driver's licence", 'International passport']
const idType = ref(idTypes[0]!)
const idPhoto = ref<string | null>(null)
const selfie = ref<string | null>(null)
const proof = ref<string | null>(null)

watch(session.ready, (ready) => {
  if (!ready) return
  const u = session.user.value
  if (u?.role === 'vendor') {
    // Already registered: only the verification step is left to do here.
    if (route.query.step === '3') step.value = 3
    else navigateTo('/vendor', { replace: true })
  } else if (u) {
    ownerName.value = u.name
    biz.whatsapp = u.phone.replace(/\D/g, '').replace(/^234/, '')
    step.value = 2
  }
}, { immediate: true })

async function sendCode() {
  busy.value = true
  await api.requestCode(`+234${digits.value}`)
  codeSent.value = true
  busy.value = false
}

async function verifyPhone() {
  busy.value = true
  error.value = null
  try {
    const u = await api.verifyCode(`+234${digits.value}`, code.value)
    if (u.role === 'vendor') {
      await session.signIn(u)
      await navigateTo('/vendor', { replace: true })
      return
    }
    await session.signIn({ ...u, name: ownerName.value.trim() || u.name })
    biz.whatsapp = digits.value
    step.value = 2
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

async function pinLocation() {
  await locate()
  pinned.value = location.value.source === 'device'
}

const step2Valid = computed(() => biz.name.trim().length > 1 && biz.whatsapp.replace(/\D/g, '').length >= 10 && (biz.delivery || biz.pickup))

async function saveBusiness() {
  if (!step2Valid.value) return
  busy.value = true
  const u = session.user.value!
  const vendor = await api.registerVendor({
    name: biz.name.trim(),
    category: biz.category,
    whatsapp: `234${biz.whatsapp.replace(/\D/g, '').replace(/^234/, '').replace(/^0/, '')}`,
    landmark: biz.landmark.trim(),
    lat: location.value.lat,
    lng: location.value.lng,
    delivery: biz.delivery,
    pickup: biz.pickup,
    ownerName: u.name,
  })
  await session.signIn({ ...u, id: vendor.id, role: 'vendor', vendorId: vendor.id })
  busy.value = false
  step.value = 3
}

async function take(target: 'id' | 'selfie' | 'proof', source: 'camera' | 'library') {
  const photo = await pickPhoto(source)
  if (!photo) return
  if (target === 'id') idPhoto.value = photo
  else if (target === 'selfie') selfie.value = photo
  else proof.value = photo
}

async function submit() {
  const vendorId = session.user.value?.vendorId
  if (!vendorId || !idPhoto.value || !selfie.value) return
  busy.value = true
  // A real backend receives the photos here and stores them privately.
  await api.submitVerification(vendorId, { idType: idType.value, hasSelfie: true, hasBusinessProof: !!proof.value })
  await refreshNuxtData('my-vendor')
  busy.value = false
  await navigateTo('/vendor')
}

useSeoMeta({ title: 'Sell on Kusa', robots: 'noindex' })
</script>

<template>
  <div class="relative flex min-h-dvh flex-col lg:min-h-0">
    <div class="flex flex-1 flex-col gap-4 px-5 pb-28 pt-2.5 lg:px-8 lg:pt-6">
      <div class="flex items-center justify-between">
        <button v-if="step > 1 && !(step === 3 && session.user.value?.role === 'vendor')" type="button" aria-label="Back" class="-ml-2.5 flex size-11 cursor-pointer items-center justify-center" @click="step = (step - 1) as 1 | 2">
          <AppIcon name="chevron-left" :size="24" />
        </button>
        <NuxtLink v-else to="/" aria-label="Close" class="-ml-2.5 flex size-11 items-center justify-center text-ink"><AppIcon name="x" :size="24" /></NuxtLink>
        <span class="text-[13px] font-semibold text-muted">Step {{ step }} of 3</span>
      </div>
      <div class="grid grid-cols-3 gap-1.5" aria-hidden="true">
        <span v-for="i in 3" :key="i" class="h-[5px] rounded-full" :class="i <= step ? 'bg-palm' : 'bg-line'" />
      </div>

      <!-- Step 1 -->
      <template v-if="step === 1">
        <div class="flex flex-col gap-1.5">
          <h1 class="font-display text-[28px] font-extrabold leading-tight tracking-tight">Sell on Kusa</h1>
          <p class="text-sm text-muted">List your business for free and let shoppers near you find it. First, your phone number.</p>
        </div>
        <div class="flex flex-col gap-1.5">
          <label for="owner" class="label">Your name</label>
          <input id="owner" v-model="ownerName" type="text" autocomplete="name" placeholder="e.g. Hadiza Umar" class="field" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label for="vphone" class="label">Phone number</label>
          <div class="flex h-12 items-center overflow-hidden rounded-2xl border-[1.5px] border-line bg-surface focus-within:border-palm">
            <span class="pl-3.5 pr-1.5 font-semibold text-muted">+234</span>
            <input id="vphone" v-model="phone" type="tel" inputmode="tel" placeholder="803 000 0000" class="h-11 min-w-0 flex-1 bg-transparent text-base outline-none" />
          </div>
        </div>
        <div v-if="codeSent" class="flex flex-col gap-1.5">
          <label for="vcode" class="label">6-digit code we texted you</label>
          <input id="vcode" v-model="code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••" class="field text-center text-xl tracking-[0.4em]" />
          <span class="text-xs text-muted">Demo code: 123456</span>
        </div>
        <p v-if="error" class="text-sm text-danger-ink" role="alert">{{ error }}</p>
      </template>

      <!-- Step 2 -->
      <template v-else-if="step === 2">
        <div class="flex flex-col gap-1.5">
          <h1 class="font-display text-[28px] font-extrabold leading-tight tracking-tight">Tell shoppers about your business</h1>
          <p class="text-sm text-muted">This is what people see when they find you nearby.</p>
        </div>
        <div class="flex flex-col gap-1.5">
          <label for="bname" class="label">Business name</label>
          <input id="bname" v-model="biz.name" type="text" placeholder="e.g. Mama Hadiza Small Chops" class="field" />
        </div>
        <div class="grid grid-cols-2 gap-2.5">
          <div class="flex min-w-0 flex-col gap-1.5">
            <label for="cat" class="label">Category</label>
            <select id="cat" v-model="biz.category" class="field px-2.5">
              <option v-for="c in CATEGORIES" :key="c.id" :value="c.id">{{ c.label }}</option>
            </select>
          </div>
          <div class="flex min-w-0 flex-col gap-1.5">
            <label for="wa" class="label">WhatsApp number</label>
            <div class="flex h-12 items-center overflow-hidden rounded-2xl border-[1.5px] border-line bg-surface focus-within:border-palm">
              <span class="pl-3 pr-1 text-[15px] font-semibold text-muted">+234</span>
              <input id="wa" v-model="biz.whatsapp" type="tel" inputmode="tel" placeholder="803 000 0000" class="h-11 min-w-0 flex-1 bg-transparent text-[15px] outline-none" />
            </div>
          </div>
        </div>
        <div class="flex flex-col gap-1.5">
          <span class="label">Where are you based?</span>
          <button type="button" class="flex min-h-12 cursor-pointer items-center gap-2.5 rounded-2xl border-[1.5px] px-3.5 text-left text-sm font-bold" :class="pinned ? 'border-palm bg-palm-tint text-palm' : 'border-line bg-surface text-palm'" :disabled="locating" @click="pinLocation">
            <AppIcon :name="pinned ? 'check' : 'target'" :size="18" />
            {{ locating ? 'Finding you…' : pinned ? 'Location pinned' : 'Use my current location' }}
          </button>
          <label for="landmark" class="sr-only">Street or landmark</label>
          <input id="landmark" v-model="biz.landmark" type="text" placeholder="Street or landmark, e.g. beside Tarauni market" class="field" />
        </div>
        <fieldset class="flex flex-col gap-2">
          <legend class="label pb-2">How do customers get your products?</legend>
          <div class="grid grid-cols-2 gap-2.5">
            <label class="flex h-12 cursor-pointer items-center gap-2.5 rounded-2xl border-[1.5px] px-3.5 text-[15px] font-semibold" :class="biz.pickup ? 'border-palm bg-palm-tint' : 'border-line bg-surface'">
              <input v-model="biz.pickup" type="checkbox" class="size-5 accent-palm" />Pickup
            </label>
            <label class="flex h-12 cursor-pointer items-center gap-2.5 rounded-2xl border-[1.5px] px-3.5 text-[15px] font-semibold" :class="biz.delivery ? 'border-palm bg-palm-tint' : 'border-line bg-surface'">
              <input v-model="biz.delivery" type="checkbox" class="size-5 accent-palm" />Delivery
            </label>
          </div>
        </fieldset>
      </template>

      <!-- Step 3 -->
      <template v-else>
        <div class="flex items-start gap-3.5">
          <span class="flex size-[50px] shrink-0 items-center justify-center rounded-2xl bg-palm text-white"><AppIcon name="shield" :size="26" /></span>
          <div class="flex flex-col gap-1">
            <h1 class="font-display text-[26px] font-extrabold leading-tight tracking-tight">Get your verified badge</h1>
            <p class="text-sm leading-snug text-muted">Our team checks every business by hand, so shoppers know you're real.</p>
          </div>
        </div>
        <ol class="flex flex-col gap-2.5">
          <li class="card flex items-center gap-3 px-3.5 py-3">
            <span class="flex size-8 items-center justify-center rounded-full bg-palm text-white"><AppIcon name="check" :size="18" :stroke="2.4" /></span>
            <div class="flex flex-1 flex-col"><span class="text-[15px] font-bold">Phone number</span><span class="text-[13px] text-muted">{{ maskPhone(session.user.value?.phone ?? '') }} confirmed</span></div>
          </li>
          <li class="flex flex-col gap-3 rounded-2xl border-[1.5px] bg-surface p-3.5" :class="idPhoto ? 'border-line' : 'border-palm'">
            <div class="flex items-center gap-3">
              <span class="flex size-8 shrink-0 items-center justify-center rounded-full" :class="idPhoto ? 'bg-palm text-white' : 'border-2 border-palm text-sm font-bold text-palm'">
                <AppIcon v-if="idPhoto" name="check" :size="18" :stroke="2.4" /><template v-else>2</template>
              </span>
              <div class="flex flex-1 flex-col"><span class="text-[15px] font-bold">Government ID</span><span class="text-[13px] text-muted">A clear photo of the front</span></div>
            </div>
            <label for="idtype" class="sr-only">ID type</label>
            <select id="idtype" v-model="idType" class="field h-11"><option v-for="t in idTypes" :key="t">{{ t }}</option></select>
            <img v-if="idPhoto" :src="idPhoto" alt="ID photo preview" class="h-32 w-full rounded-xl object-cover" />
            <div class="grid grid-cols-2 gap-2">
              <button type="button" class="flex h-[60px] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-[1.5px] border-dashed border-[#9AA39E] bg-paper text-[13px] font-bold" @click="take('id', 'camera')"><AppIcon name="camera" />Take a photo</button>
              <button type="button" class="flex h-[60px] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-[1.5px] border-dashed border-[#9AA39E] bg-paper text-[13px] font-bold" @click="take('id', 'library')"><AppIcon name="upload" />Upload a file</button>
            </div>
          </li>
          <li class="card flex items-center gap-3 px-3.5 py-3">
            <span class="flex size-8 shrink-0 items-center justify-center rounded-full" :class="selfie ? 'bg-palm text-white' : 'border-2 border-[#C9C2B3] text-sm font-bold text-muted'">
              <AppIcon v-if="selfie" name="check" :size="18" :stroke="2.4" /><template v-else>3</template>
            </span>
            <div class="flex flex-1 flex-col"><span class="text-[15px] font-bold">Selfie holding your ID</span><span class="text-[13px] text-muted">So we can match your face to the ID</span></div>
            <button type="button" class="btn-outline min-h-10 px-3 text-sm" @click="take('selfie', 'camera')">{{ selfie ? 'Retake' : 'Take' }}</button>
          </li>
          <li class="card flex items-center gap-3 px-3.5 py-3">
            <span class="flex size-8 shrink-0 items-center justify-center rounded-full" :class="proof ? 'bg-palm text-white' : 'border-2 border-[#C9C2B3] text-sm font-bold text-muted'">
              <AppIcon v-if="proof" name="check" :size="18" :stroke="2.4" /><template v-else>4</template>
            </span>
            <div class="flex flex-1 flex-col"><span class="text-[15px] font-bold">Proof of business <span class="font-medium text-muted">· optional</span></span><span class="text-[13px] text-muted">CAC certificate, or a photo of your stall, shop or kitchen</span></div>
            <button type="button" class="btn-outline min-h-10 px-3 text-sm" @click="take('proof', 'library')">{{ proof ? 'Change' : 'Add' }}</button>
          </li>
        </ol>
        <p class="flex gap-2 text-[13px] leading-snug text-muted"><AppIcon name="clock" :size="18" />Reviews take up to [X] working days. You can add products while you wait; they go live once you're verified.</p>
      </template>
    </div>

    <div class="pb-safe sticky bottom-0 bg-paper px-5 pt-3 lg:px-8 lg:pb-6">
      <div class="pb-3 lg:pb-0">
        <template v-if="step === 1">
          <button v-if="!codeSent" type="button" class="btn-dark h-[54px] w-full text-base" :disabled="digits.length !== 10 || !ownerName.trim() || busy" @click="sendCode">{{ busy ? 'Sending…' : 'Send code' }}</button>
          <button v-else type="button" class="btn-dark h-[54px] w-full text-base" :disabled="code.length !== 6 || busy" @click="verifyPhone">{{ busy ? 'Checking…' : 'Continue' }}</button>
        </template>
        <button v-else-if="step === 2" type="button" class="btn-dark h-[54px] w-full text-base" :disabled="!step2Valid || busy" @click="saveBusiness">{{ busy ? 'Saving…' : 'Continue to verification' }}</button>
        <button v-else type="button" class="btn-dark h-[54px] w-full text-base" :disabled="!idPhoto || !selfie || busy" @click="submit">{{ busy ? 'Submitting…' : 'Submit for review' }}</button>
      </div>
    </div>
  </div>
</template>
