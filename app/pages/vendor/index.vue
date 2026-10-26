<script setup lang="ts">
definePageMeta({ layout: 'vendor' })

const api = useApi()
const { user } = useRequireRole('vendor')
const vendorId = computed(() => user.value?.vendorId ?? '')

const { data: vendor } = await useAsyncData('my-vendor', () => (vendorId.value ? api.getMyVendor() : Promise.resolve(null)), { watch: [vendorId], server: false })
const { data: stats } = await useAsyncData('my-stats', () => (vendorId.value ? api.getVendorStats() : Promise.resolve(null)), { watch: [vendorId], server: false })
const { data: products, refresh: refreshProducts } = await useAsyncData('my-products', () => (vendorId.value ? api.vendorProducts() : Promise.resolve([])), { watch: [vendorId], server: false })
const { data: rating } = await useAsyncData('my-rating', async () => {
  if (!vendor.value || vendor.value.status !== 'verified') return null
  return (await api.getVendor(vendor.value.slug, { lat: vendor.value.lat, lng: vendor.value.lng }))?.rating ?? null
}, { watch: [vendor], server: false })

const range = ref<7 | 30>(7)
const current = computed(() => stats.value?.daily.slice(-range.value) ?? [])
const previous = computed(() => stats.value?.daily.slice(-range.value * 2, -range.value) ?? [])
const sum = (rows: typeof current.value, k: 'views' | 'visitors' | 'whatsapp' | 'calls' | 'directions') => rows.reduce((a, r) => a + r[k], 0)

const kpis = computed(() => {
  const change = (k: 'views' | 'visitors') => {
    const now = sum(current.value, k)
    const before = sum(previous.value, k)
    return before ? Math.round(((now - before) / before) * 100) : null
  }
  return {
    views: sum(current.value, 'views'),
    visitors: sum(current.value, 'visitors'),
    viewsChange: change('views'),
    visitorsChange: change('visitors'),
    whatsapp: sum(current.value, 'whatsapp'),
    calls: sum(current.value, 'calls'),
    directions: sum(current.value, 'directions'),
  }
})

const topProducts = computed(() => {
  const views = stats.value?.productViews ?? {}
  return (products.value ?? [])
    .map((p) => ({ ...p, views: views[p.id] ?? 0 }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 4)
})

async function toggle(id: string, available: boolean) {
  await api.setProductAvailable(id, available)
  await refreshProducts()
}

const firstName = computed(() => user.value?.name.split(' ')[0] ?? '')
const changeLabel = (n: number | null) => (n === null ? 'No earlier data' : `${n >= 0 ? '▲' : '▼'} ${Math.abs(n)}% vs ${range.value === 7 ? 'last week' : 'previous 30 days'}`)

useSeoMeta({ title: 'My shop · Kusa', robots: 'noindex' })
</script>

<template>
  <div class="mx-auto flex max-w-[1100px] flex-col gap-4 px-5 pb-8 pt-3.5 lg:gap-6 lg:px-8 lg:pt-8">
    <div v-if="!vendor" class="flex flex-col gap-3 pt-4">
      <div class="h-12 animate-pulse rounded-2xl bg-sand" />
      <div class="h-40 animate-pulse rounded-2xl bg-sand" />
    </div>

    <template v-else>
      <div class="flex items-center gap-3">
        <span class="flex size-12 shrink-0 items-center justify-center rounded-[15px] font-display text-[17px] font-extrabold lg:size-14" :style="{ backgroundColor: vendor.tint }">{{ vendor.initials }}</span>
        <div class="flex min-w-0 flex-1 flex-col">
          <span class="text-[13px] text-muted">Sannu, {{ firstName }}</span>
          <h1 class="truncate text-base font-bold lg:font-display lg:text-2xl lg:font-extrabold lg:tracking-tight">{{ vendor.name }}</h1>
        </div>
        <NuxtLink v-if="vendor.status === 'verified'" :to="`/v/${vendor.slug}`" class="flex min-h-10 items-center whitespace-nowrap rounded-full border-[1.5px] border-ink px-3 text-[13px] font-bold text-ink">View shop</NuxtLink>
      </div>

      <VendorStatusBanner :vendor="vendor" />

      <div class="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-6">
        <!-- Insights -->
        <section class="flex flex-col gap-2.5" aria-labelledby="insights-h">
          <div class="flex items-center justify-between gap-3">
            <h2 id="insights-h" class="text-[17px] font-bold">Your shop {{ range === 7 ? 'this week' : 'this month' }}</h2>
            <div class="flex rounded-full bg-sand p-1" role="group" aria-label="Time range">
              <button v-for="r in [7, 30] as const" :key="r" type="button" :aria-pressed="range === r" class="h-8 cursor-pointer rounded-full px-3 text-[13px] font-bold" :class="range === r ? 'bg-surface text-ink shadow-sm' : 'text-muted'" @click="range = r">
                {{ r }} days
              </button>
            </div>
          </div>
          <div class="card flex flex-col gap-4 p-4 lg:p-5">
            <div class="grid grid-cols-2 gap-3">
              <div class="flex flex-col gap-0.5">
                <span class="flex items-center gap-1.5 text-[13px] text-muted"><AppIcon name="eye" :size="16" />Profile views</span>
                <span class="font-display text-[30px] font-extrabold leading-none lg:text-4xl">{{ kpis.views.toLocaleString() }}</span>
                <span class="text-xs font-bold" :class="(kpis.viewsChange ?? 0) >= 0 ? 'text-palm' : 'text-danger-ink'">{{ changeLabel(kpis.viewsChange) }}</span>
              </div>
              <div class="flex flex-col gap-0.5">
                <span class="flex items-center gap-1.5 text-[13px] text-muted"><AppIcon name="users" :size="16" />Unique visitors</span>
                <span class="font-display text-[30px] font-extrabold leading-none lg:text-4xl">{{ kpis.visitors.toLocaleString() }}</span>
                <span class="text-xs font-bold" :class="(kpis.visitorsChange ?? 0) >= 0 ? 'text-palm' : 'text-danger-ink'">{{ changeLabel(kpis.visitorsChange) }}</span>
              </div>
            </div>
            <TrafficChart v-if="kpis.views" :days="current" />
            <p v-else class="rounded-xl bg-paper px-4 py-6 text-center text-sm text-ink-2">
              No visits yet{{ vendor.status === 'verified' ? '' : ' (your shop goes live once verified)' }}. Share your shop link on WhatsApp to get your first visitors.
            </p>
            <div class="grid grid-cols-3 gap-2 border-t border-line-2 pt-3">
              <div class="flex flex-col gap-0.5"><span class="font-display text-[22px] font-extrabold leading-none">{{ kpis.whatsapp }}</span><span class="text-xs text-muted">WhatsApp taps</span></div>
              <div class="flex flex-col gap-0.5"><span class="font-display text-[22px] font-extrabold leading-none">{{ kpis.calls }}</span><span class="text-xs text-muted">Calls</span></div>
              <div class="flex flex-col gap-0.5"><span class="font-display text-[22px] font-extrabold leading-none">{{ kpis.directions }}</span><span class="text-xs text-muted">Direction requests</span></div>
            </div>
          </div>
          <p class="text-xs text-muted">A visitor is one person (one phone or computer) per day. Views count every time your shop or products are opened.</p>
        </section>

        <div class="flex flex-col gap-4 lg:gap-6">
          <section v-if="stats?.sources.length" class="flex flex-col gap-2.5" aria-labelledby="sources-h">
            <h2 id="sources-h" class="text-[17px] font-bold">How shoppers found you</h2>
            <div class="card flex flex-col gap-3 p-4">
              <div v-for="s in stats.sources" :key="s.label" class="flex flex-col gap-1">
                <div class="flex justify-between text-[13px]"><span>{{ s.label }}</span><strong>{{ Math.round(s.share * 100) }}%</strong></div>
                <span class="block h-2 overflow-hidden rounded-full bg-sand"><span class="block h-2 rounded-full bg-palm" :style="{ width: `${s.share * 100}%` }" /></span>
              </div>
            </div>
          </section>

          <section v-if="rating" class="flex flex-col gap-2.5" aria-labelledby="rating-h">
            <div class="flex items-baseline justify-between">
              <h2 id="rating-h" class="text-[17px] font-bold">Your rating</h2>
              <NuxtLink :to="`/v/${vendor.slug}?tab=reviews`" class="text-sm font-bold">See reviews</NuxtLink>
            </div>
            <RatingSummaryCard :rating="rating" />
          </section>

          <section v-if="topProducts.length" class="flex flex-col gap-2.5" aria-labelledby="top-h">
            <h2 id="top-h" class="text-[17px] font-bold">Most viewed products</h2>
            <ol class="card flex flex-col divide-y divide-line-2">
              <li v-for="p in topProducts" :key="p.id" class="flex items-center gap-3 px-4 py-2.5">
                <PhotoBox :tint="p.tint" :src="p.image" class="size-10 shrink-0 rounded-lg" />
                <span class="min-w-0 flex-1 truncate text-sm font-semibold">{{ p.name }}</span>
                <span class="text-[13px] text-muted">{{ p.views }} views</span>
              </li>
            </ol>
          </section>
        </div>
      </div>

      <section class="flex flex-col gap-1.5" aria-labelledby="listings-h">
        <div class="flex items-center justify-between">
          <h2 id="listings-h" class="text-[17px] font-bold">Your listings · {{ products?.length ?? 0 }}</h2>
          <NuxtLink to="/vendor/listings/new" class="flex h-10 items-center gap-1.5 rounded-full bg-palm px-3.5 text-sm font-bold text-white"><AppIcon name="plus" :size="18" :stroke="2.2" />Add product</NuxtLink>
        </div>
        <ListingRow v-for="p in products?.slice(0, 5)" :key="p.id" :product="p" @toggle="toggle" />
        <NuxtLink v-if="(products?.length ?? 0) > 5" to="/vendor/listings" class="py-3 text-sm font-bold">See all listings</NuxtLink>
      </section>
    </template>
  </div>
</template>
