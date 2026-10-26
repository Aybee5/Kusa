<script setup lang="ts">
import type { Promotion } from '~/services/api'

definePageMeta({ layout: 'vendor' })

const api = useApi()
const toast = useToast()
const { user } = useRequireRole('vendor')
const vendorId = computed(() => user.value?.vendorId ?? '')

const { data: vendor } = await useAsyncData('my-vendor', () => (vendorId.value ? api.getMyVendor() : Promise.resolve(null)), { watch: [vendorId], server: false })
const { data: promotions, refresh } = await useAsyncData('my-promotions', () => (vendorId.value ? api.myPromotions() : Promise.resolve([] as Promotion[])), { watch: [vendorId], server: false })

const live = computed(() => promotions.value?.filter((p) => p.state === 'running' || p.state === 'scheduled') ?? [])
const waiting = computed(() => promotions.value?.filter((p) => p.state === 'pending') ?? [])
const past = computed(() => promotions.value?.filter((p) => ['ended', 'rejected', 'cancelled'].includes(p.state)) ?? [])
const verified = computed(() => vendor.value?.status === 'verified')

const target = (p: Promotion) => [p.city ?? 'All cities', p.category ? `${categoryLabel(p.category)} only` : 'home page and all searches'].join(' · ')
const what = (p: Promotion) => p.kind === 'product' ? p.productName : p.kind === 'banner' ? `“${p.headline}”` : 'Your business'

const editing = ref<string | null>(null)
const ref_ = ref('')
async function saveRef(p: Promotion) {
  if (!ref_.value.trim()) return
  try {
    await api.updateMyPromotion(p.id, { paymentRef: ref_.value.trim() })
    editing.value = null
    await refresh()
    toast.show('Payment reference added')
  } catch (e) {
    toast.show((e as Error).message)
  }
}
async function cancel(p: Promotion) {
  try {
    await api.updateMyPromotion(p.id, { action: 'cancel' })
    await refresh()
    toast.show('Request cancelled')
  } catch (e) {
    toast.show((e as Error).message)
  }
}

useSeoMeta({ title: 'Promote · Kusa', robots: 'noindex' })
</script>

<template>
  <div class="mx-auto flex max-w-[1000px] flex-col gap-5 px-5 pb-10 pt-3.5 lg:gap-7 lg:px-8 lg:pt-8">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div class="flex flex-col gap-1">
        <h1 class="font-display text-[26px] font-extrabold tracking-tight lg:text-[34px]">Promote your business</h1>
        <p class="max-w-[560px] text-[15px] text-muted">Get in front of more shoppers near you: a featured spot, a banner, or one of your products first. Every placement is marked Sponsored.</p>
      </div>
      <NuxtLink v-if="verified" to="/vendor/promote/new" class="btn-dark"><AppIcon name="plus" :size="18" />New promotion</NuxtLink>
    </div>

    <div v-if="!promotions || !vendor" class="flex flex-col gap-3">
      <div v-for="i in 2" :key="i" class="h-32 animate-pulse rounded-2xl bg-sand" />
    </div>

    <template v-else>
      <div v-if="!verified" class="flex items-start gap-3 rounded-2xl bg-amber-tint p-4 text-[#5C3B00]">
        <AppIcon name="shield" class="mt-0.5 shrink-0" />
        <p class="text-sm font-semibold">You can promote your business once it’s verified. <NuxtLink to="/vendor" class="font-bold underline">Check your verification</NuxtLink></p>
      </div>

      <!-- Running and scheduled -->
      <section v-if="live.length" class="flex flex-col gap-3" aria-labelledby="live-h">
        <h2 id="live-h" class="text-[17px] font-bold">Running now</h2>
        <article v-for="p in live" :key="p.id" class="card flex flex-col gap-4 p-4 lg:p-5">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="flex min-w-0 flex-col gap-1">
              <span class="text-[13px] font-bold text-muted">{{ PROMOTION_LABELS[p.kind] }}</span>
              <strong class="truncate text-base">{{ what(p) }}</strong>
              <span class="text-[13px] text-muted">{{ target(p) }}</span>
            </div>
            <div class="flex flex-col items-end gap-1">
              <PromotionStatePill :state="p.state" />
              <span class="text-[13px] font-semibold">
                {{ p.state === 'scheduled' ? `Starts ${shortDate(p.startsAt)}` : `${daysLeft(p)} ${daysLeft(p) === 1 ? 'day' : 'days'} left · ends ${shortDate(p.endsAt)}` }}
              </span>
            </div>
          </div>
          <div class="grid grid-cols-3 gap-2.5">
            <div class="flex flex-col gap-0.5 rounded-xl bg-paper p-3">
              <span class="text-xs font-bold text-muted">Seen</span>
              <span class="font-display text-[22px] font-extrabold leading-none">{{ p.impressions.toLocaleString('en-NG') }}</span>
            </div>
            <div class="flex flex-col gap-0.5 rounded-xl bg-paper p-3">
              <span class="text-xs font-bold text-muted">Taps</span>
              <span class="font-display text-[22px] font-extrabold leading-none">{{ p.clicks.toLocaleString('en-NG') }}</span>
            </div>
            <div class="flex flex-col gap-0.5 rounded-xl bg-paper p-3">
              <span class="text-xs font-bold text-muted">Tap rate</span>
              <span class="font-display text-[22px] font-extrabold leading-none">{{ clickRate(p) }}</span>
            </div>
          </div>
        </article>
      </section>

      <!-- Waiting for approval -->
      <section v-if="waiting.length" class="flex flex-col gap-3" aria-labelledby="wait-h">
        <h2 id="wait-h" class="text-[17px] font-bold">Waiting for approval</h2>
        <article v-for="p in waiting" :key="p.id" class="card flex flex-col gap-3 p-4 lg:p-5">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="flex min-w-0 flex-col gap-1">
              <span class="text-[13px] font-bold text-muted">{{ PROMOTION_LABELS[p.kind] }} · {{ p.durationDays }} days · {{ formatNaira(p.price) }}</span>
              <strong class="truncate text-base">{{ what(p) }}</strong>
              <span class="text-[13px] text-muted">{{ target(p) }} · from {{ shortDate(p.startsAt) }}</span>
            </div>
            <PromotionStatePill :state="p.state" />
          </div>
          <div v-if="editing === p.id" class="flex flex-wrap gap-2">
            <label :for="`ref-${p.id}`" class="sr-only">Transfer reference</label>
            <input :id="`ref-${p.id}`" v-model="ref_" type="text" maxlength="80" placeholder="Transfer reference or sender name" class="field h-11 min-w-0 flex-1" />
            <button type="button" class="btn-dark" @click="saveRef(p)">Save</button>
            <button type="button" class="btn-outline" @click="editing = null">Cancel</button>
          </div>
          <div v-else class="flex flex-wrap items-center justify-between gap-2">
            <span class="text-sm">
              <template v-if="p.paymentRef">Payment reference: <strong>{{ p.paymentRef }}</strong></template>
              <template v-else><span class="text-muted">No payment reference yet.</span></template>
            </span>
            <span class="flex gap-2">
              <button type="button" class="min-h-10 cursor-pointer rounded-xl border-[1.5px] border-ink px-3 text-[13px] font-bold" @click="editing = p.id; ref_ = p.paymentRef ?? ''">{{ p.paymentRef ? 'Change reference' : 'Add reference' }}</button>
              <button type="button" class="min-h-10 cursor-pointer rounded-xl px-3 text-[13px] font-bold text-danger-ink hover:bg-danger-tint" @click="cancel(p)">Cancel request</button>
            </span>
          </div>
        </article>
      </section>

      <!-- Empty -->
      <section v-if="verified && !live.length && !waiting.length" class="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-[#C9C0AE] px-5 py-10 text-center">
        <span class="flex size-14 items-center justify-center rounded-2xl bg-palm-tint text-palm"><AppIcon name="megaphone" :size="28" /></span>
        <h2 class="text-lg font-bold">No promotions running</h2>
        <p class="max-w-[420px] text-sm text-muted">Featured businesses show at the top of searches and on the home page for shoppers in your city. Plans start from a week.</p>
        <NuxtLink to="/vendor/promote/new" class="btn-primary">Promote your business</NuxtLink>
      </section>

      <!-- History -->
      <section v-if="past.length" class="flex flex-col gap-2" aria-labelledby="past-h">
        <h2 id="past-h" class="text-[17px] font-bold">Past promotions</h2>
        <div class="card divide-y divide-line-2">
          <div v-for="p in past" :key="p.id" class="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3">
            <div class="flex min-w-0 flex-[1_1_260px] flex-col">
              <strong class="truncate text-sm">{{ PROMOTION_LABELS[p.kind] }} · {{ what(p) }}</strong>
              <span class="text-[13px] text-muted">{{ shortDate(p.startsAt) }} – {{ shortDate(p.endsAt) }} · {{ formatNaira(p.price) }}</span>
              <span v-if="p.state === 'rejected' && p.adminNote" class="text-[13px] font-semibold text-danger-ink">{{ p.adminNote }}</span>
            </div>
            <span v-if="p.state === 'ended'" class="text-[13px] text-muted">{{ p.impressions.toLocaleString('en-NG') }} seen · {{ p.clicks }} taps · {{ clickRate(p) }}</span>
            <PromotionStatePill :state="p.state" />
          </div>
        </div>
      </section>
    </template>
  </div>
</template>
