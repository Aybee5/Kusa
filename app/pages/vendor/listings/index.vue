<script setup lang="ts">
definePageMeta({ layout: 'vendor' })

const api = useApi()
const { user } = useRequireRole('vendor')
const vendorId = computed(() => user.value?.vendorId ?? '')
const { data: products, refresh } = await useAsyncData('my-products', () => (vendorId.value ? api.vendorProducts() : Promise.resolve([])), { watch: [vendorId], server: false })

async function toggle(id: string, available: boolean) {
  await api.setProductAvailable(id, available)
  await refresh()
}

useSeoMeta({ title: 'Listings · Kusa', robots: 'noindex' })
</script>

<template>
  <div class="mx-auto flex max-w-[760px] flex-col gap-3 px-5 pb-8 pt-5 lg:px-8 lg:pt-8">
    <div class="flex items-center justify-between gap-3">
      <h1 class="font-display text-[28px] font-extrabold tracking-tight">Listings</h1>
      <NuxtLink to="/vendor/listings/new" class="flex h-10 items-center gap-1.5 rounded-full bg-palm px-3.5 text-sm font-bold text-white"><AppIcon name="plus" :size="18" :stroke="2.2" />Add product</NuxtLink>
    </div>
    <p class="text-sm text-muted">Tap a product to edit or delete it. Turn it off when it's sold out; it stays on your page, marked "Sold out".</p>
    <div class="flex flex-col">
      <ListingRow v-for="p in products" :key="p.id" :product="p" @toggle="toggle" />
      <p v-if="products && !products.length" class="py-10 text-center text-sm text-muted">No products yet. Add your first one.</p>
    </div>
  </div>
</template>
