<script setup lang="ts" generic="T extends string | number">
// A native <select> styled as a filter chip: accessible and fast on any phone.
const props = defineProps<{ id: string; label: string; options: { value: T; label: string }[]; active?: boolean; icon?: string }>()
const model = defineModel<T>({ required: true })
const current = computed(() => props.options.find((o) => o.value === model.value)?.label ?? '')
</script>

<template>
  <label
    :for="id"
    class="relative flex h-10 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border-[1.5px] px-3.5 text-sm font-semibold"
    :class="active ? 'border-ink bg-ink text-white' : 'border-line bg-surface text-ink'"
  >
    <AppIcon v-if="icon" :name="icon" :size="16" />
    <span class="sr-only">{{ label }}:</span>
    {{ current }}
    <AppIcon name="chevron-down" :size="14" />
    <select :id="id" v-model="model" class="absolute inset-0 cursor-pointer opacity-0">
      <option v-for="o in options" :key="String(o.value)" :value="o.value">{{ o.label }}</option>
    </select>
  </label>
</template>
