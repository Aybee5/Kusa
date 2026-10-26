<script setup lang="ts">
const props = defineProps<{ status: string }>()

const looks: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Awaiting review', cls: 'bg-amber-tint text-amber-ink' },
  verified: { label: 'Verified', cls: 'bg-palm-tint text-palm' },
  changes: { label: 'Changes requested', cls: 'bg-info-tint text-info-ink' },
  rejected: { label: 'Rejected', cls: 'bg-danger-tint text-danger-ink' },
  suspended: { label: 'Suspended', cls: 'bg-danger-tint text-danger-ink' },
  published: { label: 'Published', cls: 'bg-palm-tint text-palm' },
  flagged: { label: 'Flagged', cls: 'bg-amber-tint text-amber-ink' },
  hidden: { label: 'Hidden', cls: 'bg-danger-tint text-danger-ink' },
  active: { label: 'Active', cls: 'bg-palm-tint text-palm' },
}
const look = computed(() => looks[props.status] ?? { label: props.status, cls: 'bg-sand text-ink' })
</script>

<template>
  <span class="inline-flex h-[26px] items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[12.5px] font-bold" :class="look.cls">
    <span class="size-[7px] rounded-full bg-current" />
    {{ look.label }}
  </span>
</template>
