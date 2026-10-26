<script setup lang="ts">
import type { CategoryId, VendorStatus } from '#shared/types'
import type { AdminVendor } from '~/services/api'

definePageMeta({ layout: 'admin' })

const api = useApi()
const toast = useToast()
const { data: vendors, refresh } = await useAsyncData('admin-vendors', () => api.adminVendors())
const { data: counts } = useNuxtData<{ pending: number; flagged: number }>('admin-counts')

type Tab = 'all' | 'pending' | 'verified' | 'suspended'
const route = useRoute()
const tab = ref<Tab>((['pending', 'verified', 'suspended'].includes(String(route.query.status)) ? route.query.status : 'all') as Tab)
const q = ref('')
const category = ref<CategoryId | ''>('')
const confirming = ref<AdminVendor | null>(null)

const count = (s: VendorStatus) => vendors.value?.filter((v) => v.status === s).length ?? 0
const tabs = computed(() => [
  { id: 'all' as Tab, label: 'All', count: vendors.value?.length ?? 0 },
  { id: 'pending' as Tab, label: 'Awaiting review', count: count('pending') },
  { id: 'verified' as Tab, label: 'Verified', count: count('verified') },
  { id: 'suspended' as Tab, label: 'Suspended', count: count('suspended') },
])

const rows = computed(() => {
  const term = q.value.trim().toLowerCase()
  return (vendors.value ?? [])
    .filter((v) => tab.value === 'all' || v.status === tab.value || (tab.value === 'pending' && v.status === 'changes'))
    .filter((v) => !category.value || v.category === category.value)
    .filter((v) => !term || `${v.name} ${v.ownerName} ${v.phone}`.toLowerCase().includes(term))
    .sort((a, b) => (a.status === 'pending' ? -1 : 0) - (b.status === 'pending' ? -1 : 0) || b.joinedAt.localeCompare(a.joinedAt))
})

async function suspend(reason: string) {
  if (!confirming.value) return
  const name = confirming.value.name
  await api.setVendorStatus(confirming.value.id, 'suspended', reason)
  confirming.value = null
  await Promise.all([refresh(), refreshNuxtData('admin-counts')])
  toast.show(`${name} suspended`)
}

async function reinstate(v: AdminVendor) {
  await api.setVendorStatus(v.id, 'verified')
  await Promise.all([refresh(), refreshNuxtData('admin-counts')])
  toast.show(`${v.name} reinstated`)
}

useSeoMeta({ title: 'Vendors · Kusa admin', robots: 'noindex' })
</script>

<template>
  <div class="flex flex-wrap items-end justify-between gap-4">
    <div class="flex flex-col gap-1">
      <h1 class="font-display text-[34px] font-extrabold tracking-tight">Vendors</h1>
      <p class="text-[15px] text-muted">Review new businesses, and suspend or reinstate accounts.</p>
    </div>
    <AdminSearchField v-model="q" label="Search vendors" placeholder="Search business, owner or phone" />
  </div>

  <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
    <AdminStatTile label="Awaiting review" :value="count('pending')" tone="amber" :active="tab === 'pending'" @click="tab = 'pending'" />
    <AdminStatTile label="Verified" :value="count('verified')" :active="tab === 'verified'" @click="tab = 'verified'" />
    <AdminStatTile label="Suspended" :value="count('suspended')" :active="tab === 'suspended'" @click="tab = 'suspended'" />
    <AdminStatTile label="Flagged reviews" :value="counts?.flagged ?? 0" to="/admin/reviews" />
  </div>

  <AdminConfirmBar
    v-if="confirming"
    :key="confirming.id"
    :title="`Suspend ${confirming.name}?`"
    body="Their shop and listings will be hidden from search. They'll be told why by SMS."
    :reasons="['Reports of non-delivery', 'Misleading listings', 'Prohibited products', 'Fake or mismatched ID', 'Other']"
    confirm-label="Suspend shop"
    @cancel="confirming = null"
    @confirm="suspend"
  />

  <div class="overflow-hidden rounded-[18px] border border-line bg-surface">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
      <AdminTabPills v-model="tab" :tabs="tabs" label="Filter by status" />
      <label for="fcat" class="sr-only">Category</label>
      <select id="fcat" v-model="category" class="h-[38px] rounded-[10px] border-[1.5px] border-line bg-surface px-2.5 text-sm">
        <option value="">All categories</option>
        <option v-for="c in CATEGORIES" :key="c.id" :value="c.id">{{ c.label }}</option>
      </select>
    </div>

    <div class="hidden grid-cols-[2.4fr_1.2fr_1.4fr_1fr_0.8fr_0.9fr_1.2fr_120px] gap-3 bg-paper px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-muted md:grid">
      <span>Business</span><span>Category</span><span>Location</span><span>Joined</span><span>Listings</span><span>Rating</span><span>Status</span><span class="text-right">Action</span>
    </div>
    <div
      v-for="v in rows"
      :key="v.id"
      class="flex flex-col gap-2 border-t border-line-2 px-4 py-3.5 text-sm md:grid md:grid-cols-[2.4fr_1.2fr_1.4fr_1fr_0.8fr_0.9fr_1.2fr_120px] md:items-center md:gap-3 md:py-3"
    >
      <div class="flex min-w-0 items-center gap-2.5">
        <span class="flex size-[38px] shrink-0 items-center justify-center rounded-[11px] font-display text-[13px] font-extrabold" :style="{ backgroundColor: v.tint }">{{ v.initials }}</span>
        <div class="flex min-w-0 flex-col">
          <span class="truncate font-bold">{{ v.name }}</span>
          <span class="truncate text-[13px] text-muted">{{ v.ownerName }} · {{ maskPhone(v.phone) }}</span>
        </div>
      </div>
      <span class="text-ink-2 md:text-ink"><span class="md:hidden">{{ categoryLabel(v.category) }} · {{ v.area }} · joined {{ formatDate(v.joinedAt) }}</span><span class="hidden md:inline">{{ categoryLabel(v.category) }}</span></span>
      <span class="hidden text-ink-2 md:inline">{{ v.area }}, {{ v.city }}</span>
      <span class="hidden text-ink-2 md:inline">{{ formatDate(v.joinedAt) }}</span>
      <span class="hidden md:inline">{{ v.listingCount }}</span>
      <span class="hidden md:inline"><template v-if="v.ratingCount">★ {{ v.ratingAverage.toFixed(1) }} <span class="text-muted">({{ v.ratingCount }})</span></template><span v-else class="text-muted">–</span></span>
      <div class="flex items-center justify-between gap-2 md:contents">
        <span><StatusPill :status="v.status" /></span>
        <div class="flex justify-end">
          <NuxtLink v-if="v.status === 'pending' || v.status === 'changes'" :to="`/admin/vendors/${v.id}`" class="flex h-9 items-center rounded-[10px] bg-palm px-3.5 text-[13px] font-bold text-white">Review</NuxtLink>
          <button v-else-if="v.status === 'verified'" type="button" class="h-9 cursor-pointer rounded-[10px] border-[1.5px] border-danger-line bg-surface px-3.5 text-[13px] font-bold text-danger-ink" @click="confirming = v">Suspend</button>
          <button v-else-if="v.status === 'suspended'" type="button" class="h-9 cursor-pointer rounded-[10px] border-[1.5px] border-ink bg-surface px-3.5 text-[13px] font-bold" @click="reinstate(v)">Reinstate</button>
          <NuxtLink v-else :to="`/admin/vendors/${v.id}`" class="flex h-9 items-center rounded-[10px] border-[1.5px] border-ink px-3.5 text-[13px] font-bold text-ink">Open</NuxtLink>
        </div>
      </div>
    </div>
    <p v-if="!rows.length" class="border-t border-line-2 px-4 py-10 text-center text-sm text-muted">No vendors match these filters.</p>
  </div>
</template>
