<script setup lang="ts">
withDefaults(defineProps<{ variant?: 'stacked' | 'pill' }>(), { variant: 'stacked' })
const { location, locating, error, locate, reset } = useLocation()
const open = ref(false)

async function useDevice() {
  await locate()
  if (!error.value) open.value = false
}
async function useDefault() {
  await reset()
  open.value = false
}
</script>

<template>
  <div class="relative">
    <button
      v-if="variant === 'stacked'"
      type="button"
      class="flex min-h-11 cursor-pointer items-center gap-2.5 text-left"
      :aria-expanded="open"
      :aria-label="`Change location: ${location.label}`"
      @click="open = !open"
    >
      <span class="flex size-[38px] items-center justify-center rounded-xl bg-palm-tint text-palm"><AppIcon name="pin" /></span>
      <span class="flex flex-col">
        <span class="text-xs text-muted">Showing businesses near</span>
        <span class="flex items-center gap-1 text-[15px] font-bold">{{ location.label }}<AppIcon name="chevron-down" :size="16" /></span>
      </span>
    </button>
    <button
      v-else
      type="button"
      class="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl border-[1.5px] border-line bg-paper px-3 text-sm font-bold"
      :aria-expanded="open"
      :aria-label="`Change location: ${location.label}`"
      @click="open = !open"
    >
      <AppIcon name="pin" :size="18" class="text-palm" />
      <span class="max-w-[200px] truncate">{{ location.label }}</span>
      <AppIcon name="chevron-down" :size="16" />
    </button>

    <div v-if="open" class="absolute left-0 top-full z-40 mt-2 w-[min(320px,calc(100vw-32px))] rounded-2xl border border-line bg-surface p-2 shadow-xl">
      <button type="button" class="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-sand" :disabled="locating" @click="useDevice">
        <AppIcon name="target" class="text-palm" />
        <span class="flex flex-col">
          <span class="text-sm font-bold">{{ locating ? 'Finding you…' : 'Use my current location' }}</span>
          <span class="text-xs text-muted">Shows the closest businesses first</span>
        </span>
      </button>
      <button type="button" class="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-sand" @click="useDefault">
        <AppIcon name="pin" class="text-muted" />
        <span class="flex flex-col">
          <span class="text-sm font-bold">Nassarawa GRA, Kano</span>
          <span class="text-xs text-muted">Default area</span>
        </span>
      </button>
      <p v-if="error" class="px-3 pb-2 pt-1 text-xs text-danger-ink">{{ error }}</p>
    </div>
  </div>
</template>
