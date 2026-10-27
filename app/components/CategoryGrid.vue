<script setup lang="ts">
withDefaults(defineProps<{ large?: boolean }>(), { large: false })
// Tiles use a photo when one is in public/images/categories, else the category colour.
const tiles = CATEGORIES.map((c) => ({ ...c, photo: categoryPhoto(c.id) }))
</script>

<template>
  <div class="grid grid-cols-4 gap-2 lg:gap-2.5">
    <NuxtLink
      v-for="c in tiles"
      :key="c.id"
      :to="{ path: '/search', query: { category: c.id } }"
      class="relative flex flex-col justify-between overflow-hidden rounded-[14px] p-2.5 text-[12.5px] font-bold leading-tight transition-transform hover:-translate-y-0.5 lg:rounded-2xl lg:p-3 lg:text-sm"
      :class="[large ? 'h-[84px] lg:h-28' : 'h-[84px]', c.photo ? 'justify-end text-white' : 'text-ink']"
      :style="{ backgroundColor: c.tint }"
    >
      <template v-if="c.photo">
        <img :src="c.photo" alt="" class="absolute inset-0 size-full object-cover" loading="lazy" />
        <span class="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
        <span class="relative [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">{{ c.label }}</span>
      </template>
      <template v-else>
        <span class="size-2.5 rounded-full lg:size-3" :style="{ backgroundColor: c.dot }" />
        {{ c.label }}
      </template>
    </NuxtLink>
  </div>
</template>
