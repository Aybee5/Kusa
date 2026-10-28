<script setup lang="ts">
import type { Promotion, PromotionState } from '~/services/api'

definePageMeta({ layout: 'admin' })

const api = useApi()
const toast = useToast()
const route = useRoute()
const { data: promotions, refresh } = await useAsyncData('admin-promotions', () => api.adminPromotions())

type Tab = 'pending' | 'running' | 'scheduled' | 'past' | 'all'
const tab = ref<Tab>((route.query.tab as Tab) || 'pending')
const q = ref('')
const count = (...s: PromotionState[]) => promotions.value?.filter((p) => s.includes(p.state)).length ?? 0
const tabs = computed(() => [
  { id: 'pending' as Tab, label: 'Requests', count: count('pending') },
  { id: 'running' as Tab, label: 'Running', count: count('running') },
  { id: 'scheduled' as Tab, label: 'Scheduled', count: count('scheduled') },
  { id: 'past' as Tab, label: 'Past', count: count('ended', 'rejected', 'cancelled') },
  { id: 'all' as Tab, label: 'All', count: promotions.value?.length ?? 0 },
])
const inTab = (p: Promotion) => tab.value === 'all' || (tab.value === 'past' ? ['ended', 'rejected', 'cancelled'].includes(p.state) : p.state === tab.value)
const rows = computed(() => {
  const term = q.value.trim().toLowerCase()
  return (promotions.value ?? [])
    .filter(inTab)
    .filter((p) => !term || `${p.vendorName ?? 'Kusa'} ${p.headline ?? ''} ${p.productName ?? ''} ${p.paymentRef ?? ''}`.toLowerCase().includes(term))
})

// Money from promotions that started in the last 30 days.
const monthRevenue = computed(() => {
  const from = Date.now() - 30 * 86400000
  return (promotions.value ?? []).filter((p) => ['running', 'scheduled', 'ended'].includes(p.state) && Date.parse(p.startsAt) >= from).reduce((a, p) => a + p.price, 0)
})

const what = (p: Promotion) => p.kind === 'product' ? p.productName : p.kind === 'banner' ? `“${p.headline}”` : null
const target = (p: Promotion) => [p.city ?? 'All cities', p.category ? `${categoryLabel(p.category)} only` : 'home page and all searches'].join(' · ')

const rejecting = ref<string | null>(null)
const note = ref('')
const REJECT_REASONS = ['We couldn’t find your payment', 'The amount paid doesn’t match', 'The banner breaks our content rules', 'Your business isn’t eligible right now']

async function decide(p: Promotion, action: 'approve' | 'reject' | 'end', reason?: string) {
  try {
    await api.decidePromotion(p.id, action, reason)
    rejecting.value = null
    await Promise.all([refresh(), refreshNuxtData('admin-counts')])
    toast.show(action === 'approve' ? `Approved. Runs until ${shortDate(new Date(Date.now() + p.durationDays * 86400000).toISOString())} or later.` : action === 'reject' ? 'Request rejected; the vendor sees your note' : 'Promotion ended')
  } catch (e) {
    toast.show((e as Error).message)
  }
}

useSeoMeta({ title: 'Promotions · Kusa admin', robots: 'noindex' })
</script>

<template>
  <div class="flex flex-wrap items-end justify-between gap-4">
    <div class="flex flex-col gap-1">
      <h1 class="font-display text-[34px] font-extrabold tracking-tight">Promotions</h1>
      <p class="text-[15px] text-muted">Confirm payments and approve requests, keep an eye on what’s running, and add your own banners.</p>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <AdminSearchField v-model="q" label="Search promotions" placeholder="Business, headline or reference" />
      <NuxtLink to="/admin/promotions/new" class="flex h-11 items-center gap-1.5 rounded-xl bg-ink px-4 text-sm font-bold text-white"><AppIcon name="plus" :size="18" />New promotion</NuxtLink>
    </div>
  </div>

  <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
    <AdminStatTile label="Requests waiting" :value="count('pending')" tone="amber" :active="tab === 'pending'" @click="tab = 'pending'" />
    <AdminStatTile label="Running now" :value="count('running')" :active="tab === 'running'" @click="tab = 'running'" />
    <AdminStatTile label="Scheduled" :value="count('scheduled')" :active="tab === 'scheduled'" @click="tab = 'scheduled'" />
    <AdminStatTile label="Started in the last 30 days" :value="formatNaira(monthRevenue)" />
  </div>

  <div class="overflow-hidden rounded-[18px] border border-line bg-surface">
    <div class="border-b border-line px-4 py-3">
      <AdminTabPills v-model="tab" :tabs="tabs" label="Filter promotions" />
    </div>

    <article v-for="p in rows" :key="p.id" class="flex flex-col gap-3 border-t border-line-2 px-4 py-[18px] first-of-type:border-t-0">
      <div class="flex flex-wrap gap-4">
        <div class="flex min-w-0 flex-[1_1_420px] flex-col gap-1.5">
          <div class="flex flex-wrap items-center gap-2 text-sm">
            <span class="rounded-md bg-sand px-1.5 py-0.5 text-xs font-bold">{{ PROMOTION_LABELS[p.kind] }}</span>
            <NuxtLink v-if="p.vendorId" :to="`/admin/vendors/${p.vendorId}`" class="font-bold">{{ p.vendorName }}</NuxtLink>
            <strong v-else>Kusa house banner</strong>
            <span v-if="p.byAdmin" class="text-xs text-muted">· added by admin</span>
          </div>
          <span v-if="what(p)" class="text-[15px]">{{ what(p) }}</span>
          <a v-if="p.linkUrl" :href="p.linkUrl" target="_blank" rel="noopener" class="truncate text-[13px] font-semibold text-info-ink">{{ p.linkUrl }}</a>
          <span class="text-[13px] text-muted">
            {{ target(p) }} · {{ p.durationDays }} days ·
            <template v-if="p.state === 'pending'">wants to start {{ shortDate(p.startsAt) }}</template>
            <template v-else>{{ shortDate(p.startsAt) }} – {{ shortDate(p.endsAt) }}</template>
          </span>
          <div v-if="p.state === 'pending'" class="flex flex-wrap items-center gap-2 text-sm">
            <span class="font-display text-lg font-bold">{{ formatNaira(p.price) }}</span>
            <span v-if="p.paymentRef" class="rounded-[10px] bg-info-tint px-2 py-1 text-[13px] font-semibold text-info-ink">Reference: {{ p.paymentRef }}</span>
            <span v-else class="rounded-[10px] bg-amber-tint px-2 py-1 text-[13px] font-semibold text-amber-ink">No payment reference yet</span>
          </div>
          <span v-else-if="p.state === 'running' || p.state === 'ended'" class="text-[13px]">
            {{ formatNaira(p.price) }} · <strong>{{ p.impressions.toLocaleString('en-NG') }}</strong> seen · <strong>{{ p.clicks.toLocaleString('en-NG') }}</strong> taps · {{ clickRate(p) }} tap rate
          </span>
          <span v-if="p.adminNote && p.state !== 'pending'" class="text-[13px] text-muted">Note: {{ p.adminNote }}</span>
        </div>
        <div class="flex shrink-0 flex-col items-end gap-2">
          <PromotionStatePill :state="p.state" />
          <div v-if="p.state === 'pending' && rejecting !== p.id" class="flex gap-2">
            <button type="button" class="h-[38px] cursor-pointer rounded-[10px] border-[1.5px] border-ink bg-surface px-3.5 text-[13px] font-bold" @click="rejecting = p.id; note = REJECT_REASONS[0]!">Reject</button>
            <button type="button" class="h-[38px] cursor-pointer rounded-[10px] bg-palm px-3.5 text-[13px] font-bold text-white" @click="decide(p, 'approve')">Payment received · approve</button>
          </div>
          <button v-if="p.state === 'running' || p.state === 'scheduled'" type="button" class="h-[38px] cursor-pointer rounded-[10px] border-[1.5px] border-danger-line bg-surface px-3.5 text-[13px] font-bold text-danger-ink" @click="decide(p, 'end')">End now</button>
          <span v-if="p.state === 'running'" class="text-[13px] font-semibold">{{ daysLeft(p) }} {{ daysLeft(p) === 1 ? 'day' : 'days' }} left</span>
        </div>
      </div>
      <AdminConfirmBar
        v-if="rejecting === p.id"
        title="Reject this request?"
        :body="`${p.vendorName} sees the reason in their Promote page. Refund any payment yourself.`"
        :reasons="REJECT_REASONS"
        confirm-label="Reject request"
        @cancel="rejecting = null"
        @confirm="(reason) => decide(p, 'reject', reason)"
      />
    </article>
    <p v-if="!rows.length" class="border-t border-line-2 px-4 py-10 text-center text-sm text-muted">{{ tab === 'pending' ? 'No requests waiting.' : 'Nothing here.' }}</p>
  </div>
</template>
