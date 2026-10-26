<script setup lang="ts">
withDefaults(defineProps<{ label: string; value: number | string; tone?: 'plain' | 'amber'; to?: string; active?: boolean }>(), { tone: 'plain', active: false })
defineEmits<{ click: [] }>()
const NuxtLink = resolveComponent('NuxtLink')
</script>

<template>
  <component
    :is="to ? NuxtLink : 'button'"
    :to="to"
    :type="to ? undefined : 'button'"
    class="flex cursor-pointer flex-col gap-1.5 rounded-2xl p-[18px] text-left"
    :class="[tone === 'amber' ? 'bg-amber-tint text-[#5C3B00]' : 'border border-line bg-surface text-ink', active ? 'ring-2 ring-ink' : '']"
    @click="$emit('click')"
  >
    <span class="text-[13px] font-bold" :class="tone === 'amber' ? '' : 'text-muted'">{{ label }}</span>
    <span class="font-display text-[34px] font-extrabold leading-none">{{ value }}</span>
  </component>
</template>
