<script setup lang="ts">
withDefaults(defineProps<{ tone?: 'plain' | 'onDark' }>(), { tone: 'plain' })
</script>

<template>
  <span
    class="inline-flex h-5 shrink-0 items-center rounded-md px-1.5 text-[11px] font-bold tracking-wide"
    :class="tone === 'onDark' ? 'bg-black/55 text-white' : 'bg-amber-tint text-amber-ink'"
  >Sponsored</span>
</template>
