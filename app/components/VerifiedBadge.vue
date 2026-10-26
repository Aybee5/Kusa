<script setup lang="ts">
withDefaults(defineProps<{ size?: number; inverted?: boolean }>(), { size: 16, inverted: false })
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" role="img" aria-label="Verified business" class="shrink-0">
    <path
      :fill="inverted ? '#FFFFFF' : '#0B6E4F'"
      d="M12 2l2.4 1.8 3-.2 1 2.8 2.5 1.7-.8 2.9.8 2.9-2.5 1.7-1 2.8-3-.2L12 22l-2.4-1.8-3 .2-1-2.8-2.5-1.7.8-2.9-.8-2.9 2.5-1.7 1-2.8 3 .2z"
    />
    <path d="M8.5 12.2l2.3 2.3 4.7-4.8" fill="none" :stroke="inverted ? '#0B6E4F' : '#FFFFFF'" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
</template>
