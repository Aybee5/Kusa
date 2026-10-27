<script setup lang="ts">
import type { CategoryId } from '#shared/types'
import type { LatLng } from '#shared/types/api'
import type { ContactDraft } from '~/utils/contact-draft'
import { guessState, NG_STATES, stateLabel } from '#shared/utils/states'

definePageMeta({ layout: 'bare' })

const route = useRoute()
const api = useApi()
const session = useSession()
const { location, locate, locating } = useLocation()

const step = ref<1 | 2 | 3>(1)
const busy = ref(false)
const error = ref<string | null>(null)

// Step 1: account (email or phone, whichever sign-in method is on)
const ownerName = ref('')
const { method, other, email, phone, valid: accountValid, to, shown } = await useSignInForm()
const code = ref('')
const codeSent = ref(false)
const devCode = ref<string | null>(null)

// Step 2: business
const biz = reactive({ name: '', category: 'small-chops' as CategoryId, area: '', city: '', state: '' as string, landmark: '', delivery: true, pickup: true })
// Suggest the state from the pin until the vendor picks one.
const stateTouched = ref(false)
const contact = ref<ContactDraft>(newContactDraft())
// Where the business is. Set from the phone's location or by tapping the map,
// so vendors who don't want to share their location can still be found.
const shop = ref<LatLng | null>(null)
const mapCenter = computed<LatLng>(() => ({ lat: location.value.lat, lng: location.value.lng }))
watch(shop, (p) => {
  if (p && !stateTouched.value) biz.state = guessState(p)
})

// Step 3: verification. Photos upload as soon as they're taken; we keep the preview and the stored key.
const idTypes = ['NIN slip', "Voter's card", "Driver's licence", 'International passport'] as const
const idType = ref<(typeof idTypes)[number]>(idTypes[0])
type Shot = { preview: string; key: string | null; uploading: boolean }
const shots = reactive<Record<'id' | 'selfie' | 'proof', Shot | null>>({ id: null, selfie: null, proof: null })
const idPhoto = computed(() => shots.id?.preview ?? null)
const selfie = computed(() => shots.selfie?.preview ?? null)
const proof = computed(() => shots.proof?.preview ?? null)
const uploadsDone = computed(() => !!shots.id?.key && !!shots.selfie?.key && !(shots.proof && !shots.proof.key))

watch(session.ready, (ready) => {
  if (!ready) return
  const u = session.user.value
  if (u?.role === 'vendor') {
    // Already registered: only the verification step is left to do here.
    if (route.query.step === '3') step.value = 3
    else navigateTo('/vendor', { replace: true })
  } else if (u) {
    ownerName.value = u.name
    if (u.phone && !contact.value.phone) contact.value.phone = u.phone.replace(/^\+234/, '')
    step.value = 2
  }
}, { immediate: true })

async function run(fn: () => Promise<void>) {
  busy.value = true
  error.value = null
  try {
    await fn()
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

const sendCode = () => run(async () => {
  const res = await api.requestCode(to.value)
  devCode.value = res.devCode ?? null
  codeSent.value = true
})

const verifyPhone = () => run(async () => {
  const { user, token } = await api.verifyCode(to.value, code.value, ownerName.value.trim())
  await session.signIn(user, token)
  if (user.role === 'vendor') return void (await navigateTo('/vendor', { replace: true }))
  if (user.role === 'admin') throw new Error('This account is an admin account. Use a different one to register a business.')
  if (user.phone) contact.value.phone = user.phone.replace(/^\+234/, '')
  step.value = 2
})

async function pinLocation() {
  const p = await locate()
  if (p) shop.value = p
}

const missing = computed(() => {
  if (biz.name.trim().length < 2) return 'Add your business name'
  if (contactProblem(contact.value)) return contactProblem(contact.value)
  if (biz.area.trim().length < 2) return 'Add your area'
  if (biz.city.trim().length < 2) return 'Add your city or town'
  if (!shop.value) return 'Mark your location on the map'
  if (!biz.state) return 'Choose your state'
  if (!biz.delivery && !biz.pickup) return 'Choose pickup, delivery or both'
  return ''
})
const step2Valid = computed(() => !missing.value)

const saveBusiness = () => run(async () => {
  if (!step2Valid.value) return
  const { user } = await api.registerVendor({
    name: biz.name.trim(),
    category: biz.category,
    ...contactInput(contact.value),
    area: biz.area.trim(),
    city: biz.city.trim(),
    state: biz.state,
    landmark: biz.landmark.trim(),
    lat: shop.value!.lat,
    lng: shop.value!.lng,
    delivery: biz.delivery,
    pickup: biz.pickup,
  })
  await session.update(user)
  step.value = 3
})

async function take(target: 'id' | 'selfie' | 'proof', source: 'camera' | 'library') {
  const photo = await pickPhoto(source)
  if (!photo) return
  const shot: Shot = reactive({ preview: photo, key: null, uploading: true })
  shots[target] = shot
  error.value = null
  try {
    shot.key = (await api.uploadPhoto(photo, 'verification')).key
  } catch (e) {
    shots[target] = null
    error.value = (e as Error).message
  } finally {
    shot.uploading = false
  }
}

const submit = () => run(async () => {
  if (!shots.id?.key || !shots.selfie?.key) return
  await api.submitVerification({ idType: idType.value, idPhotoKey: shots.id.key, selfieKey: shots.selfie.key, proofKey: shots.proof?.key ?? undefined })
  await refreshNuxtData('my-vendor')
  await navigateTo('/vendor')
})

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
          <p class="text-sm text-muted">List your business for free and let shoppers near you find it. First, your {{ method === 'email' ? 'email address' : 'phone number' }}.</p>
        </div>
        <div class="flex flex-col gap-1.5">
          <label for="owner" class="label">Your name</label>
          <input id="owner" v-model="ownerName" type="text" autocomplete="name" placeholder="e.g. Hadiza Umar" class="field" />
        </div>
        <SignInField id="vaccount" v-model:email="email" v-model:phone="phone" :method="method" />
        <button v-if="other && !codeSent" type="button" class="-mt-1 self-start py-1 text-sm font-bold text-palm" @click="method = other">{{ other === 'email' ? 'Use email instead' : 'Use phone number instead' }}</button>
        <div v-if="codeSent" class="flex flex-col gap-1.5">
          <label for="vcode" class="label">6-digit code we {{ method === 'email' ? 'emailed' : 'texted' }} to {{ shown }}</label>
          <input id="vcode" v-model="code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••" class="field text-center text-xl tracking-[0.4em]" />
          <span v-if="devCode" class="text-xs text-muted">Development mode: your code is {{ devCode }}</span>
        </div>
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
        <div class="flex flex-col gap-1.5">
          <label for="cat" class="label">Category</label>
          <select id="cat" v-model="biz.category" class="field">
            <option v-for="c in CATEGORIES" :key="c.id" :value="c.id">{{ c.label }}</option>
          </select>
        </div>
        <ContactOptionsFields v-model="contact" :name="biz.name" />
        <div class="grid grid-cols-2 gap-2.5">
          <div class="flex min-w-0 flex-col gap-1.5">
            <label for="area" class="label">Area / neighbourhood</label>
            <input id="area" v-model="biz.area" type="text" autocomplete="address-level3" placeholder="e.g. Tarauni" class="field" />
          </div>
          <div class="flex min-w-0 flex-col gap-1.5">
            <label for="city" class="label">City or town</label>
            <input id="city" v-model="biz.city" type="text" autocomplete="address-level2" placeholder="e.g. Kano" class="field" />
          </div>
        </div>
        <div class="flex flex-col gap-1.5">
          <label for="bstate" class="label">State</label>
          <select id="bstate" v-model="biz.state" class="field" @change="stateTouched = true">
            <option value="" disabled>Choose your state</option>
            <option v-for="st in NG_STATES" :key="st.name" :value="st.name">{{ stateLabel(st.name) }}</option>
          </select>
          <span v-if="biz.state && !stateTouched" class="text-xs text-muted">Suggested from your map pin. Change it if it’s wrong.</span>
        </div>
        <div class="flex flex-col gap-1.5">
          <span class="label">Where shoppers can find you</span>
          <p class="text-[13px] text-muted">Tap the map or drag the pin to your shop, stall or kitchen. Sharing your phone's location is optional.</p>
          <div class="relative h-[200px] overflow-hidden rounded-2xl border border-[#E0D8C6]">
            <ClientOnly>
              <PinPicker v-model="shop" :center="mapCenter" />
              <template #fallback><div class="size-full bg-[#ECE6D8]" /></template>
            </ClientOnly>
            <button type="button" class="absolute bottom-2.5 left-2.5 z-[1000] flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-surface px-3 text-[13px] font-bold text-palm shadow" :disabled="locating" @click="pinLocation">
              <AppIcon name="target" :size="16" />{{ locating ? 'Finding you…' : 'Use my current location' }}
            </button>
            <span v-if="shop" class="absolute right-2.5 top-2.5 z-[1000] flex h-8 items-center gap-1 rounded-full bg-palm px-2.5 text-xs font-bold text-white"><AppIcon name="check" :size="14" />Pinned</span>
          </div>
          <label for="landmark" class="sr-only">Street or landmark</label>
          <input id="landmark" v-model="biz.landmark" type="text" placeholder="Street or landmark (optional), e.g. beside Tarauni market" class="field" />
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
            <div class="flex flex-1 flex-col"><span class="text-[15px] font-bold">{{ session.user.value?.email ? 'Email address' : 'Phone number' }}</span><span class="text-[13px] text-muted">{{ accountLabel(session.user.value ?? {}) }} confirmed</span></div>
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
      <p v-if="error" class="pb-2 text-sm text-danger-ink" role="alert">{{ error }}</p>
      <div class="pb-3 lg:pb-0">
        <template v-if="step === 1">
          <button v-if="!codeSent" type="button" class="btn-dark h-[54px] w-full text-base" :disabled="!accountValid || !ownerName.trim() || busy" @click="sendCode">{{ busy ? 'Sending…' : 'Send code' }}</button>
          <button v-else type="button" class="btn-dark h-[54px] w-full text-base" :disabled="code.length !== 6 || busy" @click="verifyPhone">{{ busy ? 'Checking…' : 'Continue' }}</button>
        </template>
        <button v-else-if="step === 2" type="button" class="btn-dark h-[54px] w-full text-base" :disabled="!step2Valid || busy" @click="saveBusiness">{{ busy ? 'Saving…' : missing || 'Continue to verification' }}</button>
        <button v-else type="button" class="btn-dark h-[54px] w-full text-base" :disabled="!uploadsDone || busy" @click="submit">{{ busy ? 'Submitting…' : !uploadsDone && (idPhoto || selfie) ? 'Uploading photos…' : 'Submit for review' }}</button>
      </div>
    </div>
  </div>
</template>
