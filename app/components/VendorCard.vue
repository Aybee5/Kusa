<script setup lang="ts">
import type { VendorWithMeta } from '~/types'
defineProps<{ vendor: VendorWithMeta }>()
</script>

<template>
  <NuxtLink :to="`/v/${vendor.slug}`" class="card flex flex-col overflow-hidden text-ink transition-shadow hover:shadow-md">
    <PhotoBox :tint="vendor.coverTint" :label="categoryLabel(vendor.category)" class="h-28 lg:h-36" />
    <div class="flex flex-col gap-1 px-3.5 pb-3.5 pt-3">
      <div class="flex items-center gap-1.5 text-[15px] font-bold lg:text-base">
        <span class="truncate">{{ vendor.name }}</span>
        <VerifiedBadge />
      </div>
      <div class="text-[13px] text-muted lg:text-sm">{{ categoryLabel(vendor.category) }} · {{ formatKm(vendor.distanceKm) }}</div>
      <div class="flex items-center gap-2 text-[13px] lg:text-sm">
        <RatingInline :rating="vendor.rating" />
        <span class="font-semibold" :class="vendor.openState.open ? (vendor.openState.closingSoon ? 'text-amber-ink' : 'text-palm') : 'text-muted'">
          {{ vendor.openState.label }}
        </span>
      </div>
    </div>
  </NuxtLink>
</template>
