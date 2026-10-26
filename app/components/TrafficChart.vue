<script setup lang="ts">
import type { DailyStat } from '#shared/types'

const props = defineProps<{ days: DailyStat[] }>()

const max = computed(() => Math.max(1, ...props.days.map((d) => d.views)))
const dense = computed(() => props.days.length > 14)
const label = (iso: string) => {
  const d = new Date(`${iso}T12:00:00Z`)
  return dense.value ? String(d.getUTCDate()) : d.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' })
}
const fullDate = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
const busiest = computed(() => props.days.reduce((a, b) => (b.views > a.views ? b : a), props.days[0]!))
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex items-center gap-4 text-xs text-muted">
      <span class="flex items-center gap-1.5"><span class="size-2.5 rounded-sm bg-palm-soft" />Profile views</span>
      <span class="flex items-center gap-1.5"><span class="size-2.5 rounded-sm bg-palm" />Unique visitors</span>
    </div>
    <div class="flex h-[132px] items-end gap-[3px] lg:h-[180px] lg:gap-1.5" role="img" :aria-label="`Daily profile views. Busiest day: ${busiest ? fullDate(busiest.date) : ''} with ${busiest?.views ?? 0} views.`">
      <div v-for="d in days" :key="d.date" class="group relative flex h-full flex-1 flex-col items-center justify-end gap-1">
        <div class="relative w-full rounded-t-md bg-palm-soft" :style="{ height: `${(d.views / max) * 100}%` }">
          <div class="absolute inset-x-0 bottom-0 rounded-t-md bg-palm" :style="{ height: d.views ? `${(d.visitors / d.views) * 100}%` : '0%' }" />
        </div>
        <span class="pointer-events-none absolute -top-9 z-10 hidden whitespace-nowrap rounded-lg bg-ink px-2 py-1 text-[11px] font-semibold text-white group-hover:block">
          {{ fullDate(d.date) }} · {{ d.views }} views · {{ d.visitors }} visitors
        </span>
      </div>
    </div>
    <div class="flex gap-[3px] lg:gap-1.5" aria-hidden="true">
      <span v-for="(d, i) in days" :key="d.date" class="flex-1 text-center text-[10px] text-muted lg:text-[11px]">
        {{ !dense || i % 5 === 0 || i === days.length - 1 ? label(d.date) : '' }}
      </span>
    </div>
    <table class="sr-only">
      <caption>Views and visitors by day</caption>
      <thead><tr><th>Day</th><th>Views</th><th>Visitors</th></tr></thead>
      <tbody><tr v-for="d in days" :key="d.date"><td>{{ fullDate(d.date) }}</td><td>{{ d.views }}</td><td>{{ d.visitors }}</td></tr></tbody>
    </table>
  </div>
</template>
