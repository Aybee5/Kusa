<script setup lang="ts">
import type { CategoryId, Vendor } from '#shared/types'
import type { LatLng, VendorUpdate } from '#shared/types/api'
import type { ContactDraft } from '~/utils/contact-draft'
import { NG_STATES, stateLabel } from '#shared/utils/states'

definePageMeta({ layout: 'vendor' })

const api = useApi()
const toast = useToast()
const { user } = useRequireRole('vendor')
const vendorId = computed(() => user.value?.vendorId ?? '')
const { data: vendor } = await useAsyncData('my-vendor', () => (vendorId.value ? api.getMyVendor() : Promise.resolve(null)), { watch: [vendorId], server: false })

// The form, filled from the saved business.
const form = reactive({
  name: '', category: 'small-chops' as CategoryId, about: '', area: '', city: '', state: '', landmark: '',
  delivery: true, pickup: true, opens: '09:00', closes: '18:00', closedDays: [] as number[],
})
const contact = ref<ContactDraft>(newContactDraft())
const pin = ref<LatLng | null>(null)
type Img = { url: string | null; key?: string | null; uploading?: boolean }
const cover = ref<Img>({ url: null })
const logo = ref<Img>({ url: null })

function fill(v: Vendor) {
  Object.assign(form, {
    name: v.name, category: v.category, about: v.about, area: v.area, city: v.city, state: v.state, landmark: v.landmark ?? '',
    delivery: v.delivery, pickup: v.pickup, opens: v.hours.opens, closes: v.hours.closes, closedDays: [...v.hours.closedDays],
  })
  contact.value = contactDraftFrom(v)
  pin.value = { lat: v.lat, lng: v.lng }
  cover.value = { url: v.coverImage ?? null }
  logo.value = { url: v.logo ?? null }
}
watch(vendor, (v) => v && fill(v), { immediate: true })

const asset = useAssetUrl()
const images = { cover, logo }
async function choose(which: keyof typeof images) {
  const target = images[which]
  const before = target.value
  const photo = await pickPhoto('library')
  if (!photo) return
  target.value = { url: photo, uploading: true }
  try {
    target.value = { url: photo, key: (await api.uploadPhoto(photo, 'shop')).key }
  } catch (e) {
    target.value = before
    toast.show((e as Error).message)
  }
}
const remove = (which: keyof typeof images) => (images[which].value = { url: null, key: null })

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
function toggleDay(d: number) {
  form.closedDays = form.closedDays.includes(d) ? form.closedDays.filter((x) => x !== d) : [...form.closedDays, d].sort((a, b) => a - b)
}
const hoursSummary = computed(() => {
  const open = DAYS.filter((_, i) => !form.closedDays.includes(i))
  const days = open.length === 7 ? 'Every day' : open.length ? open.join(', ') : 'No open days'
  return `${days} · ${formatClock(form.opens)} – ${formatClock(form.closes)}`
})

const problem = computed(() => {
  if (form.name.trim().length < 2) return 'Add your business name'
  const c = contactProblem(contact.value)
  if (c) return c
  if (!form.opens || !form.closes || form.closes <= form.opens) return 'Closing time must be after opening time'
  if (form.closedDays.length > 6) return 'Choose at least one open day'
  if (form.area.trim().length < 2) return 'Add your area'
  if (form.city.trim().length < 2) return 'Add your city'
  if (!pin.value) return 'Mark your location on the map'
  if (!form.delivery && !form.pickup) return 'Choose pickup, delivery or both'
  if (cover.value.uploading || logo.value.uploading) return 'Uploading photo…'
  return ''
})

const saving = ref(false)
async function save() {
  if (problem.value || saving.value) return
  saving.value = true
  try {
    const changes: VendorUpdate = {
      name: form.name.trim(), category: form.category, about: form.about.trim(),
      area: form.area.trim(), city: form.city.trim(), state: form.state, landmark: form.landmark.trim(),
      lat: pin.value!.lat, lng: pin.value!.lng, delivery: form.delivery, pickup: form.pickup,
      hours: { opens: form.opens, closes: form.closes, closedDays: form.closedDays },
      ...contactInput(contact.value),
      ...(cover.value.key !== undefined ? { coverImageKey: cover.value.key } : {}),
      ...(logo.value.key !== undefined ? { logoImageKey: logo.value.key } : {}),
    }
    vendor.value = await api.updateMyVendor(changes)
    toast.show('Shop saved')
  } catch (e) {
    toast.show((e as Error).message)
  } finally {
    saving.value = false
  }
}

useSeoMeta({ title: 'My shop · Kusa', robots: 'noindex' })
</script>

<template>
  <form class="mx-auto flex max-w-[760px] flex-col gap-6 px-5 pb-28 pt-3.5 lg:px-8 lg:pb-12 lg:pt-8" @submit.prevent="save">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div class="flex flex-col gap-1">
        <h1 class="font-display text-[28px] font-extrabold tracking-tight">My shop</h1>
        <p class="text-sm text-muted">What shoppers see on your page. Changes show straight away.</p>
      </div>
      <NuxtLink v-if="vendor?.status === 'verified'" :to="`/v/${vendor.slug}`" class="flex min-h-10 items-center gap-1.5 rounded-full border-[1.5px] border-ink px-3.5 text-[13px] font-bold text-ink">
        <AppIcon name="eye" :size="16" />View my page
      </NuxtLink>
    </div>

    <div v-if="!vendor" class="flex flex-col gap-3">
      <div v-for="i in 3" :key="i" class="h-32 animate-pulse rounded-2xl bg-sand" />
    </div>

    <template v-else>
      <VendorStatusBanner v-if="vendor.status !== 'verified'" :vendor="vendor" />

      <!-- Photos -->
      <section class="flex flex-col gap-2.5" aria-labelledby="photos-h">
        <h2 id="photos-h" class="text-[17px] font-bold">Photos</h2>
        <div class="relative">
          <button type="button" class="relative flex h-40 w-full cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-[1.5px] border-dashed border-[#9AA39E] lg:h-52" :style="{ backgroundColor: vendor.coverTint }" @click="choose('cover')">
            <img v-if="cover.url" :src="asset(cover.url)" alt="Cover photo" class="absolute inset-0 size-full object-cover" />
            <span class="relative flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[13px] font-bold"><AppIcon name="camera" :size="16" />{{ cover.uploading ? 'Uploading…' : cover.url ? 'Change cover photo' : 'Add a cover photo' }}</span>
          </button>
          <div class="absolute -bottom-6 left-4 flex items-end gap-2">
            <button type="button" class="relative cursor-pointer rounded-[22px] border-4 border-paper" aria-label="Change logo" @click="choose('logo')">
              <VendorAvatar :vendor="{ name: form.name, logo: logo.url ?? undefined, initials: initialsOf(form.name || vendor.name), tint: vendor.tint }" class="size-[76px] rounded-[18px] text-[26px]" />
              <span class="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full bg-ink text-white"><AppIcon name="camera" :size="14" /></span>
            </button>
          </div>
        </div>
        <div class="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 pl-[100px] text-[13px]">
          <span class="text-muted">Your logo, or your initials if you don’t have one.</span>
          <button v-if="logo.url" type="button" class="cursor-pointer font-bold text-danger-ink" @click="remove('logo')">Remove logo</button>
          <button v-if="cover.url" type="button" class="cursor-pointer font-bold text-danger-ink" @click="remove('cover')">Remove cover</button>
        </div>
      </section>

      <!-- Details -->
      <section class="flex flex-col gap-3" aria-labelledby="details-h">
        <h2 id="details-h" class="text-[17px] font-bold">Details</h2>
        <div class="grid gap-3 lg:grid-cols-2">
          <div class="flex flex-col gap-1.5">
            <label for="s-name" class="label">Business name</label>
            <input id="s-name" v-model="form.name" type="text" maxlength="80" class="field" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label for="s-cat" class="label">Category</label>
            <select id="s-cat" v-model="form.category" class="field">
              <option v-for="c in CATEGORIES" :key="c.id" :value="c.id">{{ c.label }}</option>
            </select>
          </div>
        </div>
        <div class="flex flex-col gap-1.5">
          <label for="s-about" class="label">About your business</label>
          <textarea id="s-about" v-model="form.about" rows="4" maxlength="600" placeholder="What you sell, what you’re known for, how far ahead to order…" class="field h-auto resize-none py-3" />
          <span class="self-end text-xs text-muted">{{ form.about.length }}/600</span>
        </div>
      </section>

      <!-- Contact -->
      <section class="flex flex-col gap-3" aria-labelledby="contact-h">
        <h2 id="contact-h" class="text-[17px] font-bold">Contact</h2>
        <ContactOptionsFields v-model="contact" :name="form.name" />
      </section>

      <!-- Hours -->
      <section class="flex flex-col gap-3" aria-labelledby="hours-h">
        <h2 id="hours-h" class="text-[17px] font-bold">Opening hours</h2>
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1.5">
            <label for="s-opens" class="label">Opens</label>
            <input id="s-opens" v-model="form.opens" type="time" step="900" class="field" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label for="s-closes" class="label">Closes</label>
            <input id="s-closes" v-model="form.closes" type="time" step="900" class="field" />
          </div>
        </div>
        <fieldset class="flex flex-col gap-2">
          <legend class="label pb-2">Open on</legend>
          <div class="grid grid-cols-7 gap-1.5">
            <button
              v-for="(d, i) in DAYS"
              :key="d"
              type="button"
              :aria-pressed="!form.closedDays.includes(i)"
              class="flex h-11 cursor-pointer items-center justify-center rounded-xl border-[1.5px] text-[13px] font-bold"
              :class="form.closedDays.includes(i) ? 'border-line bg-surface text-muted line-through' : 'border-palm bg-palm-tint text-palm'"
              @click="toggleDay(i)"
            >{{ d }}</button>
          </div>
        </fieldset>
        <p class="flex items-center gap-1.5 text-[13px] text-muted"><AppIcon name="clock" :size="16" />{{ hoursSummary }}. “Open now” in search uses these hours.</p>
      </section>

      <!-- Location -->
      <section class="flex flex-col gap-3" aria-labelledby="loc-h">
        <h2 id="loc-h" class="text-[17px] font-bold">Location</h2>
        <div class="grid grid-cols-2 gap-3">
          <div class="flex min-w-0 flex-col gap-1.5">
            <label for="s-area" class="label">Area / neighbourhood</label>
            <input id="s-area" v-model="form.area" type="text" class="field" />
          </div>
          <div class="flex min-w-0 flex-col gap-1.5">
            <label for="s-city" class="label">City or town</label>
            <input id="s-city" v-model="form.city" type="text" class="field" />
          </div>
        </div>
        <div class="flex flex-col gap-1.5">
          <label for="s-state" class="label">State</label>
          <select id="s-state" v-model="form.state" class="field">
            <option v-for="st in NG_STATES" :key="st.name" :value="st.name">{{ stateLabel(st.name) }}</option>
          </select>
        </div>
        <div class="relative h-[220px] overflow-hidden rounded-2xl border border-[#E0D8C6]">
          <ClientOnly>
            <PinPicker v-if="pin" v-model="pin" :center="pin" />
            <template #fallback><div class="size-full bg-[#ECE6D8]" /></template>
          </ClientOnly>
          <span class="absolute right-2.5 top-2.5 z-[1000] rounded-full bg-surface px-2.5 py-1 text-xs font-bold shadow">Tap or drag the pin to move</span>
        </div>
        <label for="s-landmark" class="sr-only">Street or landmark</label>
        <input id="s-landmark" v-model="form.landmark" type="text" maxlength="120" placeholder="Street or landmark (optional)" class="field" />
        <fieldset class="flex flex-col gap-2">
          <legend class="label pb-2">How do customers get your products?</legend>
          <div class="grid grid-cols-2 gap-2.5">
            <label class="flex h-12 cursor-pointer items-center gap-2.5 rounded-2xl border-[1.5px] px-3.5 text-[15px] font-semibold" :class="form.pickup ? 'border-palm bg-palm-tint' : 'border-line bg-surface'">
              <input v-model="form.pickup" type="checkbox" class="size-5 accent-palm" />Pickup
            </label>
            <label class="flex h-12 cursor-pointer items-center gap-2.5 rounded-2xl border-[1.5px] px-3.5 text-[15px] font-semibold" :class="form.delivery ? 'border-palm bg-palm-tint' : 'border-line bg-surface'">
              <input v-model="form.delivery" type="checkbox" class="size-5 accent-palm" />Delivery
            </label>
          </div>
        </fieldset>
      </section>

      <div class="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-20 border-t border-line bg-paper px-5 py-3 lg:static lg:border-0 lg:bg-transparent lg:p-0">
        <button type="submit" class="btn-dark h-[52px] w-full text-base" :disabled="!!problem || saving">{{ saving ? 'Saving…' : problem || 'Save changes' }}</button>
      </div>
    </template>
  </form>
</template>
