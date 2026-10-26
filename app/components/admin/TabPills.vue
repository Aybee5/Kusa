<script setup lang="ts" generic="T extends string">
defineProps<{ tabs: { id: T; label: string; count?: number }[]; label: string }>()
const model = defineModel<T>({ required: true })
</script>

<template>
  <div role="tablist" :aria-label="label" class="flex flex-wrap gap-1">
    <button
      v-for="t in tabs"
      :key="t.id"
      type="button"
      role="tab"
      :aria-selected="model === t.id"
      class="flex h-[38px] cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-sm font-bold"
      :class="model === t.id ? 'bg-ink text-white' : 'text-ink-2 hover:bg-sand'"
      @click="model = t.id"
    >
      {{ t.label }}<span v-if="t.count !== undefined" class="text-xs opacity-70">{{ t.count }}</span>
    </button>
  </div>
</template>
