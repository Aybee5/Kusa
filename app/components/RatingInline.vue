<script setup lang="ts">
import type { RatingSummary } from '#shared/types'
defineProps<{ rating: RatingSummary; size?: number }>()
</script>

<template>
  <span v-if="rating.count" class="inline-flex items-center gap-1">
    <svg :width="size ?? 14" :height="size ?? 14" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#E0A21B" d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z" />
    </svg>
    <strong class="text-ink">{{ rating.average.toFixed(1) }}</strong>
    <span class="text-muted">({{ rating.count }})</span>
  </span>
  <span v-else class="text-muted">New</span>
</template>
