<script setup lang="ts">
withDefaults(defineProps<{ variant?: 'stacked' | 'pill' | 'chip' }>(), { variant: 'stacked' })
const { location } = useLocation()
const open = ref(false)

const lead = computed(() => {
  switch (location.value.source) {
    case 'anywhere': return 'Showing businesses in'
    case 'device': return 'Showing businesses near'
    case 'default': return 'Default area · tap to change'
    default: return 'Showing businesses in'
  }
})
const label = computed(() => (location.value.source === 'anywhere' ? 'All Nigeria' : location.value.label))
</script>

<template>
  <button
    v-if="variant === 'stacked'"
    type="button"
    class="flex min-h-11 cursor-pointer items-center gap-2.5 text-left"
    aria-haspopup="dialog"
    :aria-label="`Change location: ${label}`"
    @click="open = true"
  >
    <span class="flex size-[38px] shrink-0 items-center justify-center rounded-xl bg-palm-tint text-palm"><AppIcon :name="location.source === 'anywhere' ? 'compass' : 'pin'" /></span>
    <span class="flex min-w-0 flex-col">
      <span class="text-xs text-muted">{{ lead }}</span>
      <span class="flex items-center gap-1 text-[15px] font-bold"><span class="truncate">{{ label }}</span><AppIcon name="chevron-down" :size="16" /></span>
    </span>
  </button>
  <button
    v-else-if="variant === 'pill'"
    type="button"
    class="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl border-[1.5px] border-line bg-paper px-3 text-sm font-bold"
    aria-haspopup="dialog"
    :aria-label="`Change location: ${label}`"
    @click="open = true"
  >
    <AppIcon :name="location.source === 'anywhere' ? 'compass' : 'pin'" :size="18" class="text-palm" />
    <span class="max-w-[200px] truncate">{{ label }}</span>
    <AppIcon name="chevron-down" :size="16" />
  </button>
  <button
    v-else
    type="button"
    class="flex h-10 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border-[1.5px] border-ink bg-ink px-3.5 text-sm font-semibold text-white"
    aria-haspopup="dialog"
    :aria-label="`Change location: ${label}`"
    @click="open = true"
  >
    <AppIcon :name="location.source === 'anywhere' ? 'compass' : 'pin'" :size="16" />
    <span class="max-w-[160px] truncate">{{ label }}</span>
    <AppIcon name="chevron-down" :size="14" />
  </button>
  <LocationSheet v-model="open" />
</template>
