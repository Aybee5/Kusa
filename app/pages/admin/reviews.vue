<script setup lang="ts">
import type { ReviewStatus } from '#shared/types'

definePageMeta({ layout: 'admin' })

const api = useApi()
const toast = useToast()
const { data: reviews, refresh } = await useAsyncData('admin-reviews', () => api.adminReviews())

type Tab = 'flagged' | 'all' | 'published' | 'hidden'
const tab = ref<Tab>('flagged')
const stars = ref(0)
const q = ref('')
const today = todayLagos()
const joined = (iso: string) => {
  const label = relativeDay(iso, today)
  return /^(Today|Yesterday|\d+ (days|weeks?) ago|1 week ago)$/.test(label) ? label.charAt(0).toLowerCase() + label.slice(1) : label
}

const count = (s: ReviewStatus) => reviews.value?.filter((r) => r.status === s).length ?? 0
const tabs = computed(() => [
  { id: 'flagged' as Tab, label: 'Flagged', count: count('flagged') },
  { id: 'all' as Tab, label: 'All reviews', count: reviews.value?.length ?? 0 },
  { id: 'published' as Tab, label: 'Published', count: count('published') },
  { id: 'hidden' as Tab, label: 'Hidden', count: count('hidden') },
])
const rows = computed(() => {
  const term = q.value.trim().toLowerCase()
  return (reviews.value ?? [])
    .filter((r) => tab.value === 'all' || r.status === tab.value)
    .filter((r) => !stars.value || r.stars === stars.value)
    .filter((r) => !term || `${r.authorName} ${r.vendorName} ${r.text}`.toLowerCase().includes(term))
})

async function setStatus(id: string, status: ReviewStatus) {
  await api.setReviewStatus(id, status)
  await Promise.all([refresh(), refreshNuxtData('admin-counts')])
  toast.show(status === 'hidden' ? 'Review hidden from the vendor’s page' : 'Review published')
}

useSeoMeta({ title: 'Reviews · Kusa admin', robots: 'noindex' })
</script>

<template>
  <div class="flex flex-wrap items-end justify-between gap-4">
    <div class="flex flex-col gap-1">
      <h1 class="font-display text-[34px] font-extrabold tracking-tight">Reviews</h1>
      <p class="text-[15px] text-muted">Check flagged ratings, and hide fake or abusive reviews before they hurt a good vendor.</p>
    </div>
    <AdminSearchField v-model="q" label="Search reviews" placeholder="Search reviewer, business or text" />
  </div>

  <div class="grid grid-cols-3 gap-3">
    <AdminStatTile label="Flagged for checking" :value="count('flagged')" tone="amber" :active="tab === 'flagged'" @click="tab = 'flagged'" />
    <AdminStatTile label="Published" :value="count('published')" :active="tab === 'published'" @click="tab = 'published'" />
    <AdminStatTile label="Hidden" :value="count('hidden')" :active="tab === 'hidden'" @click="tab = 'hidden'" />
  </div>

  <div class="overflow-hidden rounded-[18px] border border-line bg-surface">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
      <AdminTabPills v-model="tab" :tabs="tabs" label="Filter reviews" />
      <label for="fstars" class="sr-only">Rating</label>
      <select id="fstars" v-model.number="stars" class="h-[38px] rounded-[10px] border-[1.5px] border-line bg-surface px-2.5 text-sm">
        <option :value="0">All ratings</option>
        <option v-for="n in [5, 4, 3, 2, 1]" :key="n" :value="n">{{ n }} {{ n === 1 ? 'star' : 'stars' }}</option>
      </select>
    </div>

    <article v-for="r in rows" :key="r.id" class="flex flex-wrap gap-4 border-t border-line-2 px-4 py-[18px] first-of-type:border-t-0">
      <div class="flex min-w-0 flex-[1_1_480px] flex-col gap-2">
        <div class="flex flex-wrap items-center gap-2.5 text-sm">
          <StarRow :value="r.stars" :size="16" />
          <strong>{{ r.authorName }}</strong>
          <span class="text-muted">on</span>
          <NuxtLink :to="`/admin/vendors/${r.vendorId}`" class="font-bold">{{ r.vendorName }}</NuxtLink>
          <span class="text-muted">· {{ relativeDay(r.createdAt, today) }}</span>
        </div>
        <p class="text-[15px] leading-relaxed">{{ r.text || 'No written review, stars only.' }}</p>
        <div v-if="r.flagReason" class="flex items-start gap-2 self-start rounded-[10px] bg-amber-tint px-2.5 py-1.5 text-[13px] font-semibold text-[#5C3B00]">
          <AppIcon name="flag" :size="16" class="mt-px" />{{ r.flagReason }}
        </div>
        <span class="text-[13px] text-muted">
          Reviewer joined {{ r.authorJoinedAt ? joined(r.authorJoinedAt) : '–' }} · {{ r.authorReviewCount }} {{ r.authorReviewCount === 1 ? 'review' : 'reviews' }}<template v-if="r.authorStatus !== 'active'"> · account {{ r.authorStatus }}</template>
        </span>
      </div>
      <div class="flex shrink-0 flex-col items-end gap-2">
        <StatusPill :status="r.status" />
        <div class="flex gap-2">
          <button v-if="r.status !== 'published'" type="button" class="h-[38px] cursor-pointer rounded-[10px] border-[1.5px] border-ink bg-surface px-3.5 text-[13px] font-bold" @click="setStatus(r.id, 'published')">
            {{ r.status === 'hidden' ? 'Restore' : 'Keep published' }}
          </button>
          <button v-if="r.status !== 'hidden'" type="button" class="h-[38px] cursor-pointer rounded-[10px] bg-danger px-3.5 text-[13px] font-bold text-white" @click="setStatus(r.id, 'hidden')">Hide review</button>
        </div>
        <NuxtLink :to="{ path: '/admin/shoppers', query: { q: r.authorName } }" class="py-1.5 text-[13px] font-bold">View reviewer</NuxtLink>
      </div>
    </article>
    <p v-if="!rows.length" class="border-t border-line-2 px-4 py-10 text-center text-sm text-muted">Nothing here. All caught up.</p>
  </div>
</template>
