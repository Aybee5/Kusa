<script setup lang="ts">
definePageMeta({ hideBottomNav: true })

const route = useRoute()
const router = useRouter()
const api = useApi()
const { origin } = useLocation()
const saved = useSaved()
const toast = useToast()
const { share } = useContact()
const slug = computed(() => String(route.params.slug))

const { data: vendor } = await useAsyncData(`vendor-${slug.value}`, () => api.getVendor(slug.value, origin.value), { watch: [origin] })
if (!vendor.value) throw createError({ statusCode: 404, statusMessage: 'Business not found', fatal: true })

const vendorId = computed(() => vendor.value!.id)
const { data: products } = await useAsyncData(`vendor-products-${slug.value}`, () => api.listProducts(vendorId.value))
const { data: reviews, refresh: refreshReviews } = await useAsyncData(`vendor-reviews-${slug.value}`, () => api.listReviews(vendorId.value))

useTrackView(() => vendor.value?.id)

type Tab = 'products' | 'reviews' | 'about'
const tab = computed<Tab>({
  get: () => (['products', 'reviews', 'about'].includes(String(route.query.tab)) ? (route.query.tab as Tab) : 'products'),
  set: (t) => router.replace({ query: t === 'products' ? {} : { tab: t } }),
})
const tabs = computed(() => [
  { id: 'products' as Tab, label: `Products · ${products.value?.length ?? 0}` },
  { id: 'reviews' as Tab, label: `Reviews · ${vendor.value?.rating.count ?? 0}` },
  { id: 'about' as Tab, label: 'About' },
])

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const closedDays = computed(() => vendor.value!.hours.closedDays.map((d) => days[d]).join(', '))

async function report(id: string) {
  await api.reportReview(id, 'Reported by a shopper')
  await refreshReviews()
  toast.show('Thanks. Our team will check this review.')
}

const v = vendor.value
useSeoMeta({
  title: `${v.name} · ${categoryLabel(v.category)} in ${v.area}, ${v.city} · Kusa`,
  description: `${v.about} Rated ${v.rating.average.toFixed(1)} by ${v.rating.count} shoppers on Kusa.`,
  ogTitle: `${v.name} on Kusa`,
  ogDescription: `${categoryLabel(v.category)} in ${v.area}, ${v.city}. ★ ${v.rating.average.toFixed(1)} (${v.rating.count} ratings)`,
  ogType: 'website',
  ogImage: v.coverImage?.startsWith('/') ? `${useRuntimeConfig().public.siteUrl}${v.coverImage}` : v.coverImage,
})
</script>

<template>
  <div v-if="vendor" class="mx-auto max-w-[1240px] pb-10 lg:px-6 lg:pt-6">
    <!-- Cover -->
    <div class="relative">
      <PhotoBox :tint="vendor.coverTint" :src="vendor.coverImage" :alt="`${vendor.name} cover photo`" class="h-[188px] lg:h-64 lg:rounded-3xl" />
      <div class="pt-safe absolute inset-x-3 top-2.5 flex justify-between lg:inset-x-4 lg:top-4">
        <button type="button" aria-label="Back" class="flex size-11 cursor-pointer items-center justify-center rounded-full bg-surface shadow" @click="$router.back()">
          <AppIcon name="chevron-left" :size="22" />
        </button>
        <div class="flex gap-2">
          <button type="button" aria-label="Share" class="flex size-11 cursor-pointer items-center justify-center rounded-full bg-surface shadow" @click="share(vendor.name, `/v/${vendor.slug}`)">
            <AppIcon name="share" />
          </button>
          <button
            type="button"
            :aria-pressed="saved.isSaved(vendor.id)"
            aria-label="Save business"
            class="flex size-11 cursor-pointer items-center justify-center rounded-full bg-surface shadow"
            :class="saved.isSaved(vendor.id) ? 'text-[#B04A63]' : 'text-ink'"
            @click="saved.toggle(vendor.id)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" :fill="saved.isSaved(vendor.id) ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round">
              <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <div class="lg:grid lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-8">
      <!-- Info -->
      <aside class="relative -mt-[38px] flex flex-col gap-3.5 px-5 lg:sticky lg:top-6 lg:mt-[-48px] lg:self-start lg:px-0">
        <VendorAvatar :vendor="vendor" class="size-[76px] rounded-[22px] border-4 border-paper text-[26px]" />
        <div class="flex flex-col gap-2">
          <h1 class="font-display text-[26px] font-extrabold leading-tight tracking-tight lg:text-3xl">{{ vendor.name }}</h1>
          <div class="flex flex-wrap gap-1.5">
            <span class="inline-flex h-7 items-center gap-1.5 rounded-full bg-palm-tint pl-1.5 pr-2.5 text-[13px] font-bold text-palm"><VerifiedBadge />Verified business</span>
            <span class="inline-flex h-7 items-center rounded-full bg-sand px-2.5 text-[13px] font-semibold">{{ categoryLabel(vendor.category) }}</span>
          </div>
        </div>
        <div class="flex flex-col gap-1.5 text-sm">
          <button type="button" class="flex min-h-6 cursor-pointer items-center gap-2 text-left" @click="tab = 'reviews'">
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#E0A21B" d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z" /></svg>
            <span v-if="vendor.rating.count"><strong>{{ vendor.rating.average.toFixed(1) }}</strong> · <span class="underline">{{ vendor.rating.count }} ratings</span></span>
            <span v-else class="underline">No ratings yet</span>
          </button>
          <div class="flex items-center gap-2"><AppIcon name="pin" :size="18" class="text-muted" /><span>{{ vendor.area }}, {{ vendor.city }}<template v-if="vendor.distanceKm != null"> · <strong>{{ formatKm(vendor.distanceKm) }} away</strong></template></span></div>
          <div class="flex items-center gap-2"><AppIcon name="clock" :size="18" class="text-muted" />
            <span :class="vendor.openState.open ? 'font-bold text-palm' : 'text-ink-2'">{{ vendor.openState.label }}</span>
          </div>
          <div class="flex items-center gap-2"><AppIcon name="truck" :size="18" class="text-muted" />
            <span>{{ [vendor.delivery && `Delivery within ${vendor.city}`, vendor.pickup && 'Pickup'].filter(Boolean).join(' · ') }}</span>
          </div>
        </div>
        <ContactButtons :vendor="vendor" />
      </aside>

      <!-- Tabs -->
      <section class="mt-4 flex flex-col gap-3.5 px-5 lg:mt-6 lg:px-0">
        <div role="tablist" aria-label="Business sections" class="no-scrollbar flex gap-6 overflow-x-auto border-b border-line">
          <button
            v-for="t in tabs"
            :key="t.id"
            type="button"
            role="tab"
            :aria-selected="tab === t.id"
            class="h-11 shrink-0 cursor-pointer whitespace-nowrap border-b-[2.5px] text-[15px] font-bold"
            :class="tab === t.id ? 'border-palm text-ink' : 'border-transparent text-muted'"
            @click="tab = t.id"
          >
            {{ t.label }}
          </button>
        </div>

        <div v-if="tab === 'products'" class="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4">
          <NuxtLink v-for="p in products" :key="p.id" :to="`/p/${p.id}`" class="flex flex-col gap-2 text-ink">
            <div class="relative">
              <PhotoBox :tint="p.tint" :src="p.image" :alt="p.name" class="h-[124px] rounded-2xl lg:h-44" />
              <span v-if="!p.available" class="absolute left-2 top-2 rounded-full bg-ink px-2 py-0.5 text-[11px] font-bold text-white">Sold out</span>
            </div>
            <div class="flex flex-col gap-0.5">
              <span class="text-sm font-semibold leading-snug">{{ p.name }}</span>
              <span class="font-display text-base font-bold">{{ p.options?.length ? `from ${formatNaira(Math.min(...p.options.map((o) => o.price)))}` : formatNaira(p.price) }}</span>
            </div>
          </NuxtLink>
          <p v-if="!products?.length" class="col-span-full py-6 text-center text-sm text-muted">No products listed yet.</p>
        </div>

        <div v-else-if="tab === 'reviews'" class="flex flex-col gap-3.5 lg:max-w-[680px]">
          <RatingSummaryCard :rating="vendor.rating" />
          <NuxtLink :to="`/v/${vendor.slug}/rate`" class="btn-outline h-12"><AppIcon name="star" :size="18" />Rate this business</NuxtLink>
          <ReviewItem v-for="r in reviews" :key="r.id" :review="r" @report="report" />
          <p v-if="!reviews?.length" class="py-4 text-center text-sm text-muted">No written reviews yet. Be the first.</p>
        </div>

        <div v-else class="flex flex-col gap-4 text-sm leading-relaxed lg:max-w-[680px]">
          <p>{{ vendor.about }}</p>
          <div class="flex flex-col gap-2">
            <h2 class="text-[15px] font-bold">Opening hours</h2>
            <div class="flex justify-between border-b border-line pb-2"><span>Open</span><span class="font-semibold">{{ formatClock(vendor.hours.opens) }} – {{ formatClock(vendor.hours.closes) }}</span></div>
            <div v-if="closedDays" class="flex justify-between"><span>Closed</span><span class="font-semibold">{{ closedDays }}</span></div>
          </div>
          <p v-if="vendor.landmark" class="flex items-center gap-2"><AppIcon name="pin" :size="16" class="text-muted" />{{ vendor.landmark }}</p>
          <div class="flex items-center gap-2 text-[13px] text-muted"><AppIcon name="shield" :size="16" />ID and location checked by Kusa · Member since {{ formatDate(vendor.joinedAt) }}</div>
        </div>
      </section>
    </div>
  </div>
</template>
