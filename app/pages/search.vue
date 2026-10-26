<script setup lang="ts">
import type { CategoryId, SearchFilters, SortKey } from '#shared/types'

const route = useRoute()
const router = useRouter()
const api = useApi()
const { origin, location } = useLocation()

const str = (v: unknown, d = '') => (typeof v === 'string' ? v : d)
const num = (v: unknown, d: number) => (typeof v === 'string' && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : d)
const bool = (v: unknown) => v === '1'

const filters = reactive<SearchFilters>({
  q: str(route.query.q),
  category: str(route.query.category) as CategoryId | '',
  minRating: num(route.query.rating, 0),
  openNow: bool(route.query.open),
  verifiedOnly: true,
  delivery: bool(route.query.delivery),
  pickup: bool(route.query.pickup),
  radiusKm: num(route.query.radius, 5),
  sort: (str(route.query.sort, 'nearest') as SortKey),
})

// Keep the URL in step with the filters so results can be shared and the back button works.
watch(filters, (f) => {
  const query: Record<string, string> = {}
  if (f.q) query.q = f.q
  if (f.category) query.category = f.category
  if (f.minRating) query.rating = String(f.minRating)
  if (f.openNow) query.open = '1'
  if (f.delivery) query.delivery = '1'
  if (f.pickup) query.pickup = '1'
  if (f.radiusKm !== 5) query.radius = String(f.radiusKm)
  if (f.sort !== 'nearest') query.sort = f.sort
  router.replace({ query })
}, { deep: true })

const debouncedQ = ref(filters.q)
let qTimer: ReturnType<typeof setTimeout> | undefined
watch(() => filters.q, (v) => {
  if (qTimer) clearTimeout(qTimer)
  qTimer = setTimeout(() => (debouncedQ.value = v), 250)
})

const { data: results, status } = await useAsyncData(
  'search',
  () => api.searchVendors({ ...filters, q: debouncedQ.value }, origin.value),
  { watch: [debouncedQ, () => filters.category, () => filters.minRating, () => filters.openNow, () => filters.delivery, () => filters.pickup, () => filters.radiusKm, () => filters.sort, origin] },
)

const categoryOptions = [{ value: '' as CategoryId | '', label: 'All categories' }, ...CATEGORIES.map((c) => ({ value: c.id as CategoryId | '', label: c.label }))]
const radiusOptions = [1, 3, 5, 10, 0].map((r) => ({ value: r, label: r ? `Within ${r} km` : 'Any distance' }))
const ratingOptions = [
  { value: 0, label: 'Any rating' },
  { value: 3.5, label: '★ 3.5 & up' },
  { value: 4, label: '★ 4.0 & up' },
  { value: 4.5, label: '★ 4.5 & up' },
]
const sortOptions = [
  { value: 'nearest' as SortKey, label: 'Nearest' },
  { value: 'top-rated' as SortKey, label: 'Top rated' },
]

const heading = computed(() => {
  const what = filters.category ? categoryLabel(filters.category) : filters.q ? `“${filters.q}”` : 'Businesses'
  const where = filters.radiusKm ? `within ${filters.radiusKm} km` : 'near you'
  const n = results.value?.length ?? 0
  return { title: `${what} ${where}`, count: `${n} ${n === 1 ? 'result' : 'results'}` }
})

const isDesktop = useIsDesktop()
const activeId = ref<string | null>(null)
const mapExpanded = ref(false)
const mapRef = ref<{ invalidate: () => void } | null>(null)
watch(mapExpanded, () => mapRef.value?.invalidate())

function onSelect(id: string) {
  activeId.value = id
  const v = results.value?.find((x) => x.id === id)
  if (!v) return
  if (isDesktop.value) {
    document.getElementById(`result-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  } else {
    navigateTo({ path: `/v/${v.slug}`, query: { from: 'map' } })
  }
}

function clearFilters() {
  Object.assign(filters, { q: '', category: '', minRating: 0, openNow: false, delivery: false, pickup: false, radiusKm: 0 })
}

useSeoMeta({ title: () => `${heading.value.title} · Kusa` })
</script>

<template>
  <div class="mx-auto max-w-[1240px] lg:grid lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)] lg:gap-6 lg:px-6 lg:pt-6">
    <!-- Filters + results -->
    <div class="flex flex-col">
      <div class="flex flex-col gap-3 px-4 pt-2.5 lg:px-0 lg:pt-0">
        <div class="flex items-center gap-2 lg:hidden">
          <NuxtLink to="/" aria-label="Back" class="flex size-11 shrink-0 items-center justify-center rounded-xl text-ink">
            <AppIcon name="chevron-left" :size="24" />
          </NuxtLink>
          <form class="flex h-12 flex-1 items-center gap-2 rounded-2xl border-[1.5px] border-palm bg-surface pl-3.5 pr-1.5" role="search" @submit.prevent>
            <AppIcon name="search" />
            <label for="q" class="sr-only">Search</label>
            <input id="q" v-model="filters.q" type="search" enterkeyhint="search" placeholder="Search products or businesses" class="h-11 min-w-0 flex-1 bg-transparent text-base outline-none" />
            <button v-if="filters.q" type="button" aria-label="Clear search" class="flex size-9 cursor-pointer items-center justify-center rounded-[10px] bg-sand" @click="filters.q = ''">
              <AppIcon name="x" :size="16" />
            </button>
          </form>
        </div>

        <div class="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 lg:mx-0 lg:flex-wrap lg:px-0">
          <FilterSelect id="f-radius" v-model="filters.radiusKm" label="Distance" icon="pin" :options="radiusOptions" active />
          <FilterSelect id="f-rating" v-model="filters.minRating" label="Rating" :options="ratingOptions" :active="filters.minRating > 0" />
          <FilterSelect id="f-cat" v-model="filters.category" label="Category" :options="categoryOptions" :active="!!filters.category" />
          <FilterToggle v-model="filters.openNow" label="Open now" />
          <FilterToggle v-model="filters.delivery" label="Delivery" />
          <FilterToggle v-model="filters.pickup" label="Pickup" />
        </div>
      </div>

      <!-- Phone map -->
      <div class="relative mx-4 mt-3 overflow-hidden rounded-[20px] border border-[#E0D8C6] transition-[height] lg:hidden" :class="mapExpanded ? 'h-[60vh]' : 'h-[214px]'">
        <ClientOnly>
          <NearbyMap v-if="!isDesktop" ref="mapRef" :vendors="results ?? []" :origin="origin" :radius-km="filters.radiusKm" :active-id="activeId" @select="onSelect" />
          <template #fallback><div class="size-full bg-[#ECE6D8]" /></template>
        </ClientOnly>
        <button
          type="button"
          class="absolute right-2.5 top-2.5 z-[500] flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-surface px-3 text-[13px] font-bold shadow"
          @click="mapExpanded = !mapExpanded"
        >
          <AppIcon name="expand" :size="16" />{{ mapExpanded ? 'Smaller map' : 'Full map' }}
        </button>
      </div>

      <div class="flex flex-col px-4 pb-6 pt-3.5 lg:px-0">
        <div class="flex items-center justify-between gap-3 pb-1">
          <div class="flex min-w-0 flex-col">
            <h1 class="truncate text-[17px] font-bold">{{ heading.title }}</h1>
            <span class="text-xs text-muted">{{ heading.count }} · from {{ location.label }}</span>
          </div>
          <FilterSelect id="f-sort" v-model="filters.sort" label="Sort by" :options="sortOptions" />
        </div>

        <div v-if="status === 'pending' && !results" class="flex flex-col gap-3 pt-3">
          <div v-for="i in 4" :key="i" class="h-[92px] animate-pulse rounded-2xl bg-sand" />
        </div>
        <div v-else-if="!results?.length" class="flex flex-col items-center gap-3 py-12 text-center">
          <AppIcon name="search" :size="32" class="text-muted" />
          <p class="max-w-[300px] text-[15px] text-ink-2">No businesses match these filters yet. Try a wider distance or fewer filters.</p>
          <button type="button" class="btn-outline" @click="clearFilters">Clear filters</button>
        </div>
        <div v-else class="flex flex-col lg:gap-1">
          <VendorRow v-for="v in results" :id="`result-${v.id}`" :key="v.id" :vendor="v" :active="v.id === activeId" />
        </div>
      </div>
    </div>

    <!-- Desktop map -->
    <div class="sticky top-6 hidden h-[calc(100dvh-140px)] min-h-[480px] overflow-hidden rounded-3xl border border-[#E0D8C6] lg:block">
      <ClientOnly>
        <NearbyMap v-if="isDesktop" :vendors="results ?? []" :origin="origin" :radius-km="filters.radiusKm" :active-id="activeId" @select="onSelect" />
      </ClientOnly>
    </div>
  </div>
</template>
