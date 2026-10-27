<script setup lang="ts">
import type { ShopperStatus } from '#shared/types'
import type { AdminShopper } from '~/services/api'

definePageMeta({ layout: 'admin' })

const route = useRoute()
const api = useApi()
const toast = useToast()
const { data: shoppers, refresh } = await useAsyncData('admin-shoppers', () => api.adminShoppers())

type Tab = 'all' | ShopperStatus
const tab = ref<Tab>('all')
const q = ref(typeof route.query.q === 'string' ? route.query.q : '')
const confirming = ref<AdminShopper | null>(null)
const today = todayLagos()

const count = (s: ShopperStatus) => shoppers.value?.filter((x) => x.status === s).length ?? 0
const tabs = computed(() => [
  { id: 'all' as Tab, label: 'All', count: shoppers.value?.length ?? 0 },
  { id: 'active' as Tab, label: 'Active', count: count('active') },
  { id: 'flagged' as Tab, label: 'Flagged', count: count('flagged') },
  { id: 'suspended' as Tab, label: 'Suspended', count: count('suspended') },
])
const rows = computed(() => {
  const term = q.value.trim().toLowerCase()
  return (shoppers.value ?? [])
    .filter((s) => tab.value === 'all' || s.status === tab.value)
    .filter((s) => !term || `${s.name} ${s.phone ?? ''} ${s.email ?? ''}`.toLowerCase().includes(term))
})

async function suspend(reason: string) {
  if (!confirming.value) return
  const name = confirming.value.name
  await api.setShopperStatus(confirming.value.id, 'suspended', reason)
  confirming.value = null
  await refresh()
  toast.show(`${name} suspended`)
}

async function setStatus(s: AdminShopper, status: ShopperStatus) {
  await api.setShopperStatus(s.id, status)
  await refresh()
  toast.show(status === 'active' ? `${s.name} reinstated` : `${s.name} marked ${status}`)
}

useSeoMeta({ title: 'Shoppers · Kusa admin', robots: 'noindex' })
</script>

<template>
  <div class="flex flex-wrap items-end justify-between gap-4">
    <div class="flex flex-col gap-1">
      <h1 class="font-display text-[34px] font-extrabold tracking-tight">Shoppers</h1>
      <p class="text-[15px] text-muted">Buyers with an account. They can save businesses and post ratings.</p>
    </div>
    <AdminSearchField v-model="q" label="Search shoppers" placeholder="Search name or phone" />
  </div>

  <div class="grid grid-cols-3 gap-3">
    <AdminStatTile label="Active" :value="count('active')" :active="tab === 'active'" @click="tab = 'active'" />
    <AdminStatTile label="Flagged" :value="count('flagged')" tone="amber" :active="tab === 'flagged'" @click="tab = 'flagged'" />
    <AdminStatTile label="Suspended" :value="count('suspended')" :active="tab === 'suspended'" @click="tab = 'suspended'" />
  </div>

  <AdminConfirmBar
    v-if="confirming"
    :key="confirming.id"
    :title="`Suspend ${confirming.name}?`"
    body="They won't be able to sign in or post ratings, and their ratings are hidden until you reinstate them."
    :reasons="['Fake or spam ratings', 'Abusive language', 'Harassing vendors', 'Other']"
    confirm-label="Suspend shopper"
    @cancel="confirming = null"
    @confirm="suspend"
  />

  <div class="overflow-hidden rounded-[18px] border border-line bg-surface">
    <div class="border-b border-line px-4 py-3">
      <AdminTabPills v-model="tab" :tabs="tabs" label="Filter by status" />
    </div>
    <div class="hidden grid-cols-[2.2fr_1.3fr_1fr_0.8fr_0.8fr_1fr_1.1fr_150px] gap-3 bg-paper px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-muted md:grid">
      <span>Shopper</span><span>Area</span><span>Joined</span><span>Ratings</span><span>Flags</span><span>Last active</span><span>Status</span><span class="text-right">Action</span>
    </div>
    <div
      v-for="s in rows"
      :key="s.id"
      class="flex flex-col gap-2 border-t border-line-2 px-4 py-3.5 text-sm md:grid md:grid-cols-[2.2fr_1.3fr_1fr_0.8fr_0.8fr_1fr_1.1fr_150px] md:items-center md:gap-3 md:py-3"
    >
      <div class="flex min-w-0 items-center gap-2.5">
        <span class="flex size-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold" :style="{ backgroundColor: s.tint }">{{ s.initials }}</span>
        <div class="flex min-w-0 flex-col"><span class="truncate font-bold">{{ s.name }}</span><span class="truncate text-[13px] text-muted">{{ accountLabel(s) }}</span></div>
      </div>
      <span class="text-ink-2"><span class="md:hidden">{{ s.area }} · {{ s.ratingCount }} ratings · </span><span class="hidden md:inline">{{ s.area }}</span><span class="md:hidden" :class="s.flagCount ? 'font-bold text-danger-ink' : ''">{{ s.flagCount }} flagged</span></span>
      <span class="hidden text-ink-2 md:inline">{{ formatDate(s.joinedAt) }}</span>
      <span class="hidden md:inline">{{ s.ratingCount }}</span>
      <span class="hidden font-bold md:inline" :class="s.flagCount ? 'text-danger-ink' : 'text-muted'">{{ s.flagCount }}</span>
      <span class="hidden text-ink-2 md:inline">{{ relativeDay(s.lastActiveAt, today) }}</span>
      <div class="flex items-center justify-between gap-2 md:contents">
        <span><StatusPill :status="s.status" /></span>
        <div class="flex justify-end gap-2">
          <button v-if="s.status === 'flagged'" type="button" class="h-9 cursor-pointer rounded-[10px] border-[1.5px] border-line bg-surface px-3 text-[13px] font-bold" @click="setStatus(s, 'active')">Clear</button>
          <button v-if="s.status !== 'suspended'" type="button" class="h-9 cursor-pointer rounded-[10px] border-[1.5px] border-danger-line bg-surface px-3 text-[13px] font-bold text-danger-ink" @click="confirming = s">Suspend</button>
          <button v-else type="button" class="h-9 cursor-pointer rounded-[10px] border-[1.5px] border-ink bg-surface px-3 text-[13px] font-bold" @click="setStatus(s, 'active')">Reinstate</button>
        </div>
      </div>
    </div>
    <p v-if="!rows.length" class="border-t border-line-2 px-4 py-10 text-center text-sm text-muted">No shoppers match.</p>
  </div>
</template>
