<script setup lang="ts">
import type { Area } from '#shared/types/api'

const open = defineModel<boolean>({ required: true })
const api = useApi()
const { location, locating, error, locate, chooseArea, browseAnywhere } = useLocation()

const q = ref('')
const { data: areas, status } = useAsyncData('areas', () => api.listAreas(), { server: false, immediate: false })
watch(open, (v) => {
  if (v && !areas.value) refreshNuxtData('areas')
  if (v) nextTick(() => document.getElementById('loc-device')?.focus())
})

// Areas grouped by city, each city with an "All of …" entry at its centre.
const groups = computed(() => {
  const term = q.value.trim().toLowerCase()
  const byCity = new Map<string, Area[]>()
  for (const a of areas.value ?? []) {
    if (term && !`${a.area} ${a.city}`.toLowerCase().includes(term)) continue
    byCity.set(a.city, [...(byCity.get(a.city) ?? []), a])
  }
  return [...byCity.entries()].map(([city, list]) => {
    const total = list.reduce((n, a) => n + a.count, 0)
    const whole: Area = {
      city, area: `All of ${city}`, count: total,
      lat: list.reduce((s, a) => s + a.lat * a.count, 0) / total,
      lng: list.reduce((s, a) => s + a.lng * a.count, 0) / total,
    }
    return { city, whole, list }
  })
})

const isCurrent = (a: Area) => location.value.source === 'area' && location.value.label === `${a.area}, ${a.city}`

async function pick(a: Area) {
  await chooseArea(a)
  open.value = false
}
async function device() {
  if (await locate()) open.value = false
}
async function anywhere() {
  await browseAnywhere()
  open.value = false
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') open.value = false
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-[1000] flex items-end justify-center lg:items-center" @keydown="onKey">
      <button type="button" class="absolute inset-0 cursor-default bg-ink/40" aria-label="Close" tabindex="-1" @click="open = false" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="loc-title"
        class="pb-safe relative flex max-h-[85dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-paper shadow-2xl lg:max-h-[80vh] lg:w-[460px] lg:rounded-3xl"
      >
        <div class="flex items-center justify-between px-5 pb-2 pt-4">
          <h2 id="loc-title" class="font-display text-xl font-extrabold tracking-tight">Where should we look?</h2>
          <button type="button" aria-label="Close" class="flex size-11 cursor-pointer items-center justify-center rounded-full hover:bg-sand" @click="open = false">
            <AppIcon name="x" />
          </button>
        </div>

        <div class="flex flex-col gap-2 overflow-y-auto px-5 pb-5">
          <button id="loc-device" type="button" class="card flex w-full cursor-pointer items-center gap-3 p-3.5 text-left hover:bg-sand" :disabled="locating" @click="device">
            <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-palm-tint text-palm"><AppIcon name="target" /></span>
            <span class="flex flex-1 flex-col">
              <span class="text-[15px] font-bold">{{ locating ? 'Finding you…' : 'Use my current location' }}</span>
              <span class="text-xs text-muted">Closest businesses first. We only use it to sort results and don’t save it.</span>
            </span>
            <AppIcon v-if="location.source === 'device'" name="check" class="text-palm" />
          </button>
          <p v-if="error" class="px-1 text-[13px] text-danger-ink" role="alert">{{ error }}</p>

          <button type="button" class="card flex w-full cursor-pointer items-center gap-3 p-3.5 text-left hover:bg-sand" @click="anywhere">
            <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sand text-ink"><AppIcon name="compass" /></span>
            <span class="flex flex-1 flex-col">
              <span class="text-[15px] font-bold">Browse anywhere</span>
              <span class="text-xs text-muted">No location needed. Best rated first, from every city.</span>
            </span>
            <AppIcon v-if="location.source === 'anywhere'" name="check" class="text-palm" />
          </button>

          <div class="mt-3 flex flex-col gap-2">
            <h3 class="px-1 text-sm font-bold">Or choose an area</h3>
            <div class="flex h-11 items-center gap-2 rounded-xl border-[1.5px] border-line bg-surface px-3 focus-within:border-palm">
              <AppIcon name="search" :size="18" class="text-muted" />
              <label for="loc-q" class="sr-only">Search areas and cities</label>
              <input id="loc-q" v-model="q" type="search" placeholder="Search an area or city" class="h-10 min-w-0 flex-1 bg-transparent text-[15px] outline-none" />
            </div>

            <div v-if="status === 'pending' && !areas" class="flex flex-col gap-2 pt-1">
              <div v-for="i in 4" :key="i" class="h-11 animate-pulse rounded-xl bg-sand" />
            </div>
            <p v-else-if="!groups.length" class="px-1 py-3 text-sm text-muted">
              {{ q ? `No businesses listed in “${q}” yet.` : 'No areas yet.' }}
            </p>
            <div v-for="g in groups" :key="g.city" class="flex flex-col">
              <span class="px-1 pb-1 pt-2 text-xs font-bold uppercase tracking-wide text-muted">{{ g.city }}</span>
              <div class="card flex flex-col divide-y divide-line-2 overflow-hidden">
                <button v-for="a in [g.whole, ...g.list]" :key="a.area" type="button" class="flex min-h-12 w-full cursor-pointer items-center gap-3 px-3.5 text-left hover:bg-sand" @click="pick(a)">
                  <span class="flex-1 text-[15px]" :class="a === g.whole ? 'font-bold' : 'font-semibold'">{{ a.area }}</span>
                  <span class="text-xs text-muted">{{ a.count }} {{ a.count === 1 ? 'business' : 'businesses' }}</span>
                  <AppIcon v-if="isCurrent(a)" name="check" :size="18" class="text-palm" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
