<script setup lang="ts">
definePageMeta({ hideBottomNav: true })

const route = useRoute()
const api = useApi()
const { origin } = useLocation()
const { share } = useContact()
const id = String(route.params.id)

const { data } = await useAsyncData(`product-${id}`, () => api.getProduct(id, origin.value), { watch: [origin] })
if (!data.value) throw createError({ statusCode: 404, statusMessage: 'Product not found', fatal: true })

useTrackView(() => data.value?.vendor.id, () => id)

const optionIndex = ref(Math.min(1, (data.value.product.options?.length ?? 1) - 1))
const price = computed(() => {
  const p = data.value!.product
  return p.options?.length ? p.options[optionIndex.value]!.price : p.price
})
const orderName = computed(() => {
  const p = data.value!.product
  return p.options?.length ? `${p.name} (${p.options[optionIndex.value]!.label})` : p.name
})

const p0 = data.value.product
const v0 = data.value.vendor
useSeoMeta({
  title: `${p0.name} · ${v0.name} · Kusa`,
  description: `${p0.description} ${formatNaira(p0.options?.[0]?.price ?? p0.price)} from ${v0.name}, ${v0.area}, ${v0.city}.`,
  ogTitle: `${p0.name} · ${formatNaira(p0.options?.[0]?.price ?? p0.price)}`,
  ogDescription: `From ${v0.name} on Kusa · ${v0.area}, ${v0.city}`,
  // Uploaded photos may still be data URLs, which link previews can't use.
  ogImage: p0.image?.startsWith('/') ? `${useRuntimeConfig().public.siteUrl}${p0.image}` : p0.image?.startsWith('http') ? p0.image : undefined,
})
</script>

<template>
  <div v-if="data" class="mx-auto max-w-[1240px] pb-[110px] lg:grid lg:grid-cols-2 lg:gap-10 lg:px-6 lg:pb-16 lg:pt-8">
    <div class="relative">
      <PhotoBox :tint="data.product.tint" :src="data.product.image" :alt="data.product.name" class="h-[318px] lg:h-[520px] lg:rounded-3xl" />
      <span v-if="!data.product.image" class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-white/85 px-2.5 py-1 text-xs text-ink-2">
        Product photo · {{ data.product.photoLabel }}
      </span>
      <div class="pt-safe absolute inset-x-3 top-2.5 flex justify-between lg:hidden">
        <button type="button" aria-label="Back" class="flex size-11 cursor-pointer items-center justify-center rounded-full bg-surface shadow" @click="$router.back()">
          <AppIcon name="chevron-left" :size="22" />
        </button>
        <button type="button" aria-label="Share" class="flex size-11 cursor-pointer items-center justify-center rounded-full bg-surface shadow" @click="share(data.product.name, `/p/${data.product.id}`)">
          <AppIcon name="share" />
        </button>
      </div>
    </div>

    <div class="flex flex-col gap-3.5 px-5 pt-4 lg:px-0 lg:pt-2">
      <NuxtLink :to="`/v/${data.vendor.slug}`" class="flex min-h-8 items-center gap-2 text-ink">
        <VendorAvatar :vendor="data.vendor" class="size-7 rounded-[9px] text-[11px]" />
        <span class="text-sm font-semibold">{{ data.vendor.name }}</span>
        <VerifiedBadge />
        <span class="ml-auto flex items-center gap-2 text-[13px]"><RatingInline :rating="data.vendor.rating" /><span v-if="data.vendor.distanceKm != null" class="text-muted">{{ formatKm(data.vendor.distanceKm) }}</span></span>
      </NuxtLink>

      <div class="flex items-end justify-between gap-3">
        <h1 class="font-display text-[26px] font-extrabold leading-[1.08] tracking-tight lg:text-4xl">{{ data.product.name }}</h1>
        <span class="whitespace-nowrap font-display text-[26px] font-extrabold text-palm lg:text-4xl">{{ formatNaira(price) }}</span>
      </div>

      <div class="flex flex-wrap gap-1.5">
        <span v-if="!data.product.available" class="inline-flex h-7 items-center rounded-full bg-ink px-2.5 text-[13px] font-semibold text-white">Sold out right now</span>
        <span v-for="t in data.product.tags" :key="t" class="inline-flex h-7 items-center rounded-full bg-amber-tint px-2.5 text-[13px] font-semibold text-amber-ink">{{ t }}</span>
        <span v-if="data.vendor.delivery" class="inline-flex h-7 items-center rounded-full bg-sand px-2.5 text-[13px] font-semibold">Delivery in {{ data.vendor.city }}</span>
        <span v-if="data.vendor.pickup" class="inline-flex h-7 items-center rounded-full bg-sand px-2.5 text-[13px] font-semibold">Pickup</span>
      </div>

      <fieldset v-if="data.product.options?.length" class="flex flex-col gap-2">
        <legend class="pb-2 text-sm font-bold">Choose an option</legend>
        <div class="grid grid-cols-3 gap-2 lg:max-w-[440px]">
          <button
            v-for="(o, i) in data.product.options"
            :key="o.label"
            type="button"
            :aria-pressed="i === optionIndex"
            class="flex h-14 cursor-pointer flex-col items-center justify-center gap-px rounded-[14px] border-[1.5px]"
            :class="i === optionIndex ? 'border-palm bg-palm-tint' : 'border-line bg-surface'"
            @click="optionIndex = i"
          >
            <span class="text-sm font-bold">{{ o.label }}</span>
            <span class="text-xs text-muted">{{ formatNaira(o.price) }}</span>
          </button>
        </div>
      </fieldset>

      <p class="text-sm leading-relaxed text-ink-2 lg:text-base">{{ data.product.description }}</p>

      <!-- Laptop actions -->
      <ContactButtons :vendor="data.vendor" :product-name="orderName" variant="product" class="mt-2 hidden lg:flex">
        <button type="button" class="btn-outline h-[54px] px-5" aria-label="Share" @click="share(data.product.name, `/p/${data.product.id}`)"><AppIcon name="share" /></button>
      </ContactButtons>
      <p class="hidden text-[13px] text-muted lg:block">You pay and arrange delivery with the seller directly.</p>
    </div>

    <!-- Phone action bar -->
    <div class="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface lg:hidden">
      <ContactButtons :vendor="data.vendor" :product-name="orderName" variant="bar" class="px-5 pb-3 pt-3" />
    </div>
  </div>
</template>
