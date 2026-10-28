<script setup lang="ts">
import type { SearchFilters } from '#shared/types'

const api = useApi()
const saved = useSaved()
const { origin } = useLocation()

const all: SearchFilters = { q: '', category: '', minRating: 0, openNow: false, verifiedOnly: true, delivery: false, pickup: false, radiusKm: 0, sort: 'nearest' }
const { data: vendors } = await useAsyncData('saved-vendors', () => api.searchVendors(all, origin.value), { watch: [origin], server: false })
const list = computed(() => (vendors.value ?? []).filter((v) => saved.ids.value.includes(v.id)))

useSeoMeta({ title: 'Saved · Kusa' })
</script>

<template>
  <div class="mx-auto flex max-w-[1240px] flex-col gap-4 px-5 pb-8 pt-5 lg:px-6 lg:pt-10">
    <h1 class="font-display text-[28px] font-extrabold tracking-tight lg:text-4xl">Saved</h1>
    <div v-if="list.length" class="grid gap-3 lg:grid-cols-[repeat(auto-fill,minmax(260px,1fr))] lg:gap-4">
      <VendorCard v-for="v in list" :key="v.id" :vendor="v" />
    </div>
    <div v-else class="flex flex-col items-center gap-3 py-16 text-center">
      <AppIcon name="heart" :size="32" class="text-muted" />
      <p class="max-w-[300px] text-[15px] text-ink-2">Tap the heart on a business to keep it here for next time.</p>
      <NuxtLink to="/search" class="btn-outline">Find businesses</NuxtLink>
    </div>
  </div>
</template>
