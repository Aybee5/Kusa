<script setup lang="ts">
import type { ProductWithVendor } from '~/services/api'
defineProps<{ item: ProductWithVendor; sponsored?: boolean }>()
</script>

<template>
  <NuxtLink :to="{ path: `/p/${item.product.id}`, query: sponsored ? { from: 'ad' } : undefined }" class="flex items-center gap-3 py-2 text-ink lg:gap-3.5 lg:rounded-[18px] lg:border lg:border-line lg:bg-surface lg:p-3">
    <PhotoBox :tint="item.product.tint" :src="item.product.image" :alt="item.product.name" class="size-[60px] shrink-0 rounded-[14px] lg:size-[72px] lg:rounded-xl" />
    <div class="flex min-w-0 flex-1 flex-col gap-0.5">
      <span class="truncate text-[15px] font-bold">{{ item.product.name }}</span>
      <span class="flex min-w-0 items-center gap-1.5 text-[13px] text-muted"><SponsoredTag v-if="sponsored" /><span class="truncate">{{ item.vendor.name }} · {{ item.vendor.distanceKm != null ? formatKm(item.vendor.distanceKm) : item.vendor.area }}</span></span>
    </div>
    <span class="font-display text-base font-bold lg:text-lg">{{ formatNaira(item.product.options?.[0]?.price ?? item.product.price) }}</span>
  </NuxtLink>
</template>
