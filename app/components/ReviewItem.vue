<script setup lang="ts">
import type { PublicReview } from '~/services/api'
defineProps<{ review: PublicReview }>()
defineEmits<{ report: [id: string] }>()
const today = todayLagos()
</script>

<template>
  <article class="flex flex-col gap-1.5 border-b border-line pb-3.5">
    <div class="flex items-center gap-2.5">
      <span class="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold" :style="{ backgroundColor: review.authorTint }">{{ review.authorInitials }}</span>
      <div class="flex flex-1 flex-col gap-0.5">
        <span class="text-sm font-bold">{{ review.authorName }}</span>
        <span class="flex items-center gap-1.5 text-xs text-muted"><StarRow :value="review.stars" :size="12" />{{ relativeDay(review.createdAt, today) }}</span>
      </div>
      <button type="button" class="min-h-11 cursor-pointer px-1 text-xs font-semibold text-muted underline" @click="$emit('report', review.id)">Report</button>
    </div>
    <p v-if="review.text" class="text-sm leading-relaxed">{{ review.text }}</p>
    <div v-if="review.tags.length" class="flex flex-wrap gap-1.5">
      <span v-for="t in review.tags" :key="t" class="rounded-full bg-sand px-2.5 py-1 text-xs font-semibold">{{ t }}</span>
    </div>
  </article>
</template>
