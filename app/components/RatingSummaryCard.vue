<script setup lang="ts">
import type { RatingSummary } from '~/types'
const props = defineProps<{ rating: RatingSummary }>()
const bars = computed(() =>
  props.rating.breakdown.map((n, i) => ({ stars: 5 - i, pct: props.rating.count ? Math.round((n / props.rating.count) * 100) : 0 })),
)
</script>

<template>
  <div class="card flex items-center gap-[18px] p-4">
    <div class="flex shrink-0 flex-col items-center gap-1">
      <span class="font-display text-[40px] font-extrabold leading-none">{{ rating.count ? rating.average.toFixed(1) : '–' }}</span>
      <StarRow :value="rating.average" />
      <span class="text-xs text-muted">{{ rating.count }} {{ rating.count === 1 ? 'rating' : 'ratings' }}</span>
    </div>
    <div class="flex flex-1 flex-col gap-[5px]" role="list" aria-label="Ratings by stars">
      <div v-for="b in bars" :key="b.stars" role="listitem" class="flex items-center gap-2 text-xs text-muted" :aria-label="`${b.stars} stars: ${b.pct}%`">
        <span class="w-2">{{ b.stars }}</span>
        <span class="block h-1.5 flex-1 overflow-hidden rounded-full bg-sand">
          <span class="block h-1.5 rounded-full bg-star" :style="{ width: `${b.pct}%` }" />
        </span>
      </div>
    </div>
  </div>
</template>
