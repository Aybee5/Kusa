<script setup lang="ts">
import type { SearchFilters } from '~/types'

const api = useApi()
const { origin } = useLocation()

const nearbyFilters: SearchFilters = {
  q: '', category: '', minRating: 0, openNow: false, verifiedOnly: true, delivery: false, pickup: false, radiusKm: 0, sort: 'nearest',
}

const { data: nearby } = await useAsyncData('home-nearby', async () => {
  const all = await api.searchVendors(nearbyFilters, origin.value)
  const open = all.filter((v) => v.openState.open)
  return (open.length >= 4 ? open : all).slice(0, 8)
}, { watch: [origin] })

const anyOpen = computed(() => nearby.value?.some((v) => v.openState.open) ?? false)

const { data: fresh } = await useAsyncData('home-fresh', () => api.latestProducts(origin.value, 4), { watch: [origin] })

const { user } = useSession()
const q = ref('')
function search() {
  navigateTo({ path: '/search', query: q.value ? { q: q.value } : {} })
}
</script>

<template>
  <div class="mx-auto flex max-w-[1240px] flex-col gap-[18px] px-5 pb-6 pt-3.5 lg:gap-12 lg:px-6 lg:pb-16 lg:pt-10">
    <!-- Phone header -->
    <div class="flex items-center justify-between gap-3 lg:hidden">
      <LocationButton />
      <NuxtLink
        :to="user?.role === 'vendor' ? '/vendor' : '/vendor/signup'"
        class="flex min-h-10 items-center whitespace-nowrap rounded-full border-[1.5px] border-ink px-3.5 text-[13px] font-bold text-ink"
      >
        {{ user?.role === 'vendor' ? 'My shop' : 'Sell on Kusa' }}
      </NuxtLink>
    </div>

    <section class="grid gap-[18px] lg:grid-cols-2 lg:items-center lg:gap-8">
      <div class="flex flex-col gap-3.5">
        <h1 class="font-display text-[34px] font-extrabold leading-[1.02] tracking-[-0.025em] lg:text-6xl lg:leading-none">
          Good things,<br />made near you.
        </h1>
        <p class="hidden max-w-[460px] text-lg leading-relaxed text-ink-2 lg:block">
          Small chops, snacks, beads and more from verified sellers around you. Find them, then reach them on WhatsApp.
        </p>
        <form class="flex gap-2.5 lg:hidden" role="search" @submit.prevent="search">
          <label for="home-q" class="sr-only">Search</label>
          <div class="flex h-[52px] flex-1 items-center gap-2.5 rounded-2xl border-[1.5px] border-line bg-surface px-4 focus-within:border-palm">
            <AppIcon name="search" />
            <input id="home-q" v-model="q" type="search" enterkeyhint="search" placeholder="Search small chops, beads, cakes…" class="h-11 min-w-0 flex-1 bg-transparent text-[15px] outline-none" />
          </div>
          <NuxtLink to="/search" aria-label="Filters" class="flex size-[52px] items-center justify-center rounded-2xl bg-ink text-white">
            <AppIcon name="sliders" :size="22" />
          </NuxtLink>
        </form>
      </div>
      <div class="flex flex-col gap-2.5">
        <h2 class="text-[17px] font-bold lg:sr-only">Browse by category</h2>
        <CategoryGrid large />
      </div>
    </section>

    <section class="flex flex-col gap-2.5 lg:gap-4">
      <div class="flex items-baseline justify-between gap-3">
        <h2 class="text-[17px] font-bold lg:font-display lg:text-[26px] lg:font-extrabold lg:tracking-tight">{{ anyOpen ? 'Open now, close to you' : 'Close to you' }}</h2>
        <NuxtLink to="/search" class="py-2.5 text-sm font-bold lg:text-[15px]">See map</NuxtLink>
      </div>
      <div class="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 lg:mx-0 lg:grid lg:grid-cols-[repeat(auto-fill,minmax(260px,1fr))] lg:gap-4 lg:overflow-visible lg:px-0">
        <VendorCard v-for="v in nearby" :key="v.id" :vendor="v" class="w-[232px] shrink-0 lg:w-auto" />
      </div>
    </section>

    <section class="flex flex-col gap-1 lg:gap-4">
      <h2 class="mb-1.5 text-[17px] font-bold lg:mb-0 lg:font-display lg:text-[26px] lg:font-extrabold lg:tracking-tight">Just listed nearby</h2>
      <div class="flex flex-col lg:grid lg:grid-cols-[repeat(auto-fill,minmax(360px,1fr))] lg:gap-3">
        <ProductRow v-for="item in fresh" :key="item.product.id" :item="item" />
      </div>
    </section>

    <section class="hidden flex-wrap items-center justify-between gap-5 rounded-3xl bg-ink p-8 text-white lg:flex">
      <div class="flex max-w-[620px] flex-col gap-1.5">
        <h2 class="font-display text-[28px] font-extrabold tracking-tight">Do you sell from home or a small shop?</h2>
        <p class="text-base text-[#C9D1CC]">List your business, get your verified badge, and let nearby shoppers find you.</p>
      </div>
      <NuxtLink to="/vendor/signup" class="flex h-[52px] items-center rounded-2xl bg-saffron px-6 text-base font-bold text-ink">Register your business</NuxtLink>
    </section>
  </div>
</template>
