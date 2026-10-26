<script setup lang="ts">
// Stand-in for vendor and product photos until real uploads are wired up.
defineProps<{ tint: string; label?: string; src?: string; alt?: string }>()
</script>

<template>
  <div class="relative overflow-hidden photo-ph" :style="{ backgroundColor: tint }">
    <img v-if="src" :src="src" :alt="alt ?? ''" class="absolute inset-0 h-full w-full object-cover" loading="lazy" />
    <span v-else-if="label" class="absolute left-2.5 bottom-2.5 max-w-[calc(100%-20px)] truncate rounded-full bg-white/85 px-2 py-0.5 text-[11px] text-ink-2">
      Photo · {{ label }}
    </span>
  </div>
</template>
