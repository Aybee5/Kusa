<script setup lang="ts">
defineProps<{ label: string }>()
const model = defineModel<boolean>({ required: true })
</script>

<template>
  <button
    type="button"
    :aria-pressed="model"
    class="flex h-10 shrink-0 cursor-pointer items-center whitespace-nowrap rounded-full border-[1.5px] px-3.5 text-sm font-semibold"
    :class="model ? 'border-palm bg-palm-tint text-palm' : 'border-line bg-surface text-ink'"
    @click="model = !model"
  >
    {{ label }}
  </button>
</template>
