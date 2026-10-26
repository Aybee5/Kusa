<script setup lang="ts">
const props = withDefaults(defineProps<{ value: number; size?: number }>(), { size: 14 })
const stars = computed(() => [1, 2, 3, 4, 5].map((i) => (props.value >= i - 0.25 ? '#E0A21B' : '#DDD5C6')))
</script>

<template>
  <span class="inline-flex gap-px" role="img" :aria-label="`${value} out of 5 stars`">
    <svg v-for="(fill, i) in stars" :key="i" :width="size" :height="size" viewBox="0 0 24 24" aria-hidden="true">
      <path :fill="fill" d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z" />
    </svg>
  </span>
</template>
