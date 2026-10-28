<script setup lang="ts">
import type { Vendor } from '#shared/types'
// The vendor's logo, or their initials on their colour.
defineProps<{ vendor: Pick<Vendor, 'name' | 'logo' | 'initials' | 'tint'> }>()
const asset = useAssetUrl()
</script>

<template>
  <span class="flex shrink-0 items-center justify-center overflow-hidden font-display font-extrabold" :style="{ backgroundColor: vendor.tint }">
    <img v-if="vendor.logo" :src="asset(vendor.logo)" :alt="`${vendor.name} logo`" class="size-full object-cover" />
    <template v-else>{{ vendor.initials }}</template>
  </span>
</template>
