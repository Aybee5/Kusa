<script setup lang="ts">
import type { ProductWithVendor } from '~/services/api'
defineProps<{ item: ProductWithVendor }>()
</script>

<template>
  <NuxtLink :to="`/p/${item.product.id}`" class="flex items-center gap-3 py-2 text-ink lg:gap-3.5 lg:rounded-[18px] lg:border lg:border-line lg:bg-surface lg:p-3">
    <PhotoBox :tint="item.product.tint" :src="item.product.image" :alt="item.product.name" class="size-[60px] shrink-0 rounded-[14px] lg:size-[72px] lg:rounded-xl" />
    <div class="flex min-w-0 flex-1 flex-col gap-0.5">
      <span class="truncate text-[15px] font-bold">{{ item.product.name }}</span>
      <span class="truncate text-[13px] text-muted">{{ item.vendor.name }} · {{ formatKm(item.vendor.distanceKm) }}</span>
    </div>
    <span class="font-display text-base font-bold lg:text-lg">{{ formatNaira(item.product.options?.[0]?.price ?? item.product.price) }}</span>
  </NuxtLink>
</template>
