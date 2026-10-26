<script setup lang="ts">
import type { VendorWithMeta } from '#shared/types'
defineProps<{ vendor: VendorWithMeta; active?: boolean; sponsored?: boolean }>()
</script>

<template>
  <NuxtLink
    :to="{ path: `/v/${vendor.slug}`, query: sponsored ? { from: 'ad' } : undefined }"
    class="flex gap-3 border-t border-line py-3 text-ink first:border-t-0 lg:rounded-2xl lg:border lg:border-transparent lg:px-3 lg:first:border-t-transparent lg:hover:bg-surface"
    :class="active ? 'lg:!border-palm lg:bg-surface' : ''"
  >
    <PhotoBox :tint="vendor.coverTint" class="size-[76px] shrink-0 rounded-2xl" />
    <div class="flex min-w-0 flex-1 flex-col gap-[3px]">
      <div class="flex items-center gap-1.5 text-[15px] font-bold">
        <span class="truncate">{{ vendor.name }}</span>
        <VerifiedBadge />
      </div>
      <div class="flex items-center gap-1 text-[13px] text-muted">
        <SponsoredTag v-if="sponsored" class="mr-0.5" />
        <RatingInline :rating="vendor.rating" />
        <span class="truncate">· {{ vendor.area }}</span>
      </div>
      <div class="flex items-center gap-2.5 text-[13px]">
        <span v-if="vendor.distanceKm != null" class="flex shrink-0 items-center gap-0.5 whitespace-nowrap font-bold"><AppIcon name="pin" :size="14" />{{ formatKm(vendor.distanceKm) }}</span>
        <span v-else class="flex shrink-0 items-center gap-0.5 whitespace-nowrap font-bold"><AppIcon name="pin" :size="14" />{{ vendor.city }}</span>
        <span class="truncate font-semibold" :class="vendor.openState.open ? (vendor.openState.closingSoon ? 'text-amber-ink' : 'text-palm') : 'text-muted'">
          {{ vendor.openState.label }}
        </span>
      </div>
    </div>
    <div v-if="vendor.fromPrice" class="flex flex-col items-end justify-center">
      <span class="text-[11px] text-muted">from</span>
      <span class="font-display text-base font-bold">{{ formatNaira(vendor.fromPrice) }}</span>
    </div>
  </NuxtLink>
</template>
