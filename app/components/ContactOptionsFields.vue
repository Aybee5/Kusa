<script setup lang="ts">
import type { ContactChannel } from '#shared/types'
import type { ContactDraft } from '~/utils/contact-draft'
// Business phone, and which buttons shoppers see: WhatsApp, Instagram, Call,
// with one chosen as the main (highlighted) button.
const props = defineProps<{ name: string }>()
const d = defineModel<ContactDraft>({ required: true })

const channels = computed(() => [
  { kind: 'whatsapp' as ContactChannel, label: 'WhatsApp', icon: 'chat', on: d.value.whatsappOn },
  { kind: 'instagram' as ContactChannel, label: 'Instagram', icon: 'instagram', on: d.value.instagramOn },
  { kind: 'phone' as ContactChannel, label: 'Calls', icon: 'phone', on: d.value.showPhone },
])
// Keep the main button on one that's switched on.
watch(channels, (list) => {
  if (!list.find((c) => c.kind === d.value.primaryContact)?.on) {
    const first = list.find((c) => c.on)
    if (first) d.value.primaryContact = first.kind
  }
}, { deep: true })

const input = computed(() => contactInput(d.value))
const preview = computed(() => ({
  id: 'preview', name: props.name || 'Your business', lat: 0, lng: 0,
  phone: input.value.phone, whatsapp: input.value.whatsapp?.slice(1) ?? null, instagram: d.value.instagramOn ? (normalizeInstagram(d.value.instagram) ?? 'you') : null,
  showPhone: d.value.showPhone, primaryContact: d.value.primaryContact,
}))
const anyOn = computed(() => channels.value.some((c) => c.on))
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-col gap-1.5">
      <label for="c-phone" class="label">Business phone number</label>
      <div class="flex h-12 items-center overflow-hidden rounded-2xl border-[1.5px] border-line bg-surface focus-within:border-palm">
        <span class="pl-3.5 pr-1.5 font-semibold text-muted">+234</span>
        <input id="c-phone" v-model="d.phone" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="803 000 0000" class="h-11 min-w-0 flex-1 bg-transparent text-base outline-none" />
      </div>
      <span class="text-xs text-muted">Kusa uses this to reach you. Shoppers see it only if you turn on calls.</span>
    </div>

    <fieldset class="flex flex-col gap-2">
      <legend class="label pb-2">How shoppers can reach you</legend>

      <div class="card flex flex-col gap-2.5 p-3">
        <label class="flex cursor-pointer items-center gap-3">
          <span class="flex size-9 items-center justify-center rounded-xl bg-palm-tint text-palm"><AppIcon name="chat" :size="18" /></span>
          <span class="flex-1 text-[15px] font-semibold">WhatsApp</span>
          <input v-model="d.whatsappOn" type="checkbox" class="size-5 accent-palm" />
        </label>
        <div v-if="d.whatsappOn" class="flex h-11 items-center overflow-hidden rounded-xl border-[1.5px] border-line bg-surface focus-within:border-palm">
          <span class="pl-3 pr-1 text-sm font-semibold text-muted">+234</span>
          <label for="c-wa" class="sr-only">WhatsApp number</label>
          <input id="c-wa" v-model="d.whatsapp" type="tel" inputmode="tel" placeholder="Same as business phone" class="h-10 min-w-0 flex-1 bg-transparent text-[15px] outline-none" />
        </div>
      </div>

      <div class="card flex flex-col gap-2.5 p-3">
        <label class="flex cursor-pointer items-center gap-3">
          <span class="flex size-9 items-center justify-center rounded-xl bg-palm-tint text-palm"><AppIcon name="instagram" :size="18" /></span>
          <span class="flex-1 text-[15px] font-semibold">Instagram</span>
          <input v-model="d.instagramOn" type="checkbox" class="size-5 accent-palm" />
        </label>
        <div v-if="d.instagramOn" class="flex h-11 items-center overflow-hidden rounded-xl border-[1.5px] border-line bg-surface focus-within:border-palm">
          <span class="pl-3 pr-0.5 text-sm font-semibold text-muted">@</span>
          <label for="c-ig" class="sr-only">Instagram username</label>
          <input id="c-ig" v-model="d.instagram" type="text" autocapitalize="off" spellcheck="false" placeholder="yourshop" class="h-10 min-w-0 flex-1 bg-transparent text-[15px] outline-none" />
        </div>
      </div>

      <label class="card flex cursor-pointer items-center gap-3 p-3">
        <span class="flex size-9 items-center justify-center rounded-xl bg-palm-tint text-palm"><AppIcon name="phone" :size="18" /></span>
        <span class="flex flex-1 flex-col"><span class="text-[15px] font-semibold">Phone calls</span><span class="text-xs text-muted">Show a Call button with your business number</span></span>
        <input v-model="d.showPhone" type="checkbox" class="size-5 accent-palm" />
      </label>
    </fieldset>

    <fieldset v-if="channels.filter((c) => c.on).length > 1" class="flex flex-col gap-2">
      <legend class="label pb-2">Main button</legend>
      <div class="flex flex-wrap gap-2" role="radiogroup">
        <label
          v-for="c in channels.filter((x) => x.on)"
          :key="c.kind"
          class="flex h-10 cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] px-3.5 text-sm font-bold"
          :class="d.primaryContact === c.kind ? 'border-palm bg-palm text-white' : 'border-line bg-surface text-ink'"
        >
          <input v-model="d.primaryContact" type="radio" name="primary" :value="c.kind" class="sr-only" />
          <AppIcon :name="c.icon" :size="16" />{{ c.label }}
        </label>
      </div>
    </fieldset>

    <div v-if="anyOn" class="flex flex-col gap-1.5">
      <span class="text-xs font-bold text-muted">Shoppers will see</span>
      <ContactButtons :vendor="preview" preview />
    </div>
  </div>
</template>
