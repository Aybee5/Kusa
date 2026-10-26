<script setup lang="ts">
import type { VendorWithMeta } from '~/types'
defineProps<{ vendor: VendorWithMeta; active?: boolean }>()
</script>

<template>
  <NuxtLink
    :to="`/v/${vendor.slug}`"
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
        <RatingInline :rating="vendor.rating" />
        <span class="truncate">· {{ vendor.area }}</span>
      </div>
      <div class="flex items-center gap-2.5 text-[13px]">
        <span class="flex items-center gap-0.5 font-bold"><AppIcon name="pin" :size="14" />{{ formatKm(vendor.distanceKm) }}</span>
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
