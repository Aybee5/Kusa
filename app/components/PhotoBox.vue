<script setup lang="ts">
// Vendor and product photo, or a tinted stand-in when there isn't one yet.
defineProps<{ tint: string; label?: string; src?: string; alt?: string }>()
const asset = useAssetUrl()
</script>

<template>
  <div class="relative overflow-hidden photo-ph" :style="{ backgroundColor: tint }">
    <img v-if="src" :src="asset(src)" :alt="alt ?? ''" class="absolute inset-0 h-full w-full object-cover" loading="lazy" />
    <span v-else-if="label" class="absolute bottom-2.5 left-2.5 max-w-[calc(100%-20px)] truncate rounded-full bg-white/85 px-2 py-0.5 text-[11px] text-ink-2">
      Photo · {{ label }}
    </span>
  </div>
</template>
