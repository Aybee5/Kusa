<script setup lang="ts">
import type { PromotionState } from '~/services/api'
const props = defineProps<{ state: PromotionState }>()
const looks: Record<PromotionState, { label: string; cls: string }> = {
  pending: { label: 'Awaiting approval', cls: 'bg-amber-tint text-amber-ink' },
  scheduled: { label: 'Scheduled', cls: 'bg-info-tint text-info-ink' },
  running: { label: 'Running', cls: 'bg-palm-tint text-palm' },
  ended: { label: 'Ended', cls: 'bg-sand text-ink-2' },
  rejected: { label: 'Not approved', cls: 'bg-danger-tint text-danger-ink' },
  cancelled: { label: 'Cancelled', cls: 'bg-sand text-ink-2' },
}
const look = computed(() => looks[props.state])
</script>

<template>
  <span class="inline-flex h-[26px] items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[12.5px] font-bold" :class="look.cls">
    <span class="size-[7px] rounded-full bg-current" />
    {{ look.label }}
  </span>
</template>
