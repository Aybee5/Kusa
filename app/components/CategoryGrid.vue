<script setup lang="ts">
withDefaults(defineProps<{ large?: boolean }>(), { large: false })
</script>

<template>
  <div class="grid grid-cols-4 gap-2 lg:gap-2.5">
    <NuxtLink
      v-for="c in CATEGORIES"
      :key="c.id"
      :to="{ path: '/search', query: { category: c.id } }"
      class="flex flex-col justify-between rounded-[14px] p-2.5 text-[12.5px] font-bold leading-tight text-ink transition-transform hover:-translate-y-0.5 lg:rounded-2xl lg:p-3 lg:text-sm"
      :class="large ? 'h-[76px] lg:h-24' : 'h-[76px]'"
      :style="{ backgroundColor: c.tint }"
    >
      <span class="size-2.5 rounded-full lg:size-3" :style="{ backgroundColor: c.dot }" />
      {{ c.label }}
    </NuxtLink>
  </div>
</template>
