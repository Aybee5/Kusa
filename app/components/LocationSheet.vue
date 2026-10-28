<script setup lang="ts">
import type { Area } from '#shared/types/api'
import { NG_STATES, stateLabel } from '#shared/utils/states'

// Where to look: the device location, all of Nigeria, or (like a classifieds
// site) a state → city, or a neighbourhood to sort by closeness to it.
const open = defineModel<boolean>({ required: true })
const api = useApi()
const { location, place, locating, error, locate, chooseArea, browseAnywhere, choosePlace } = useLocation()

const q = ref('')
const browsing = ref<string | null>(null)
const showAllStates = ref(false)
const { data: areas, status } = useAsyncData('areas', () => api.listAreas(), { server: false, immediate: false })
watch(open, (v) => {
  if (v && !areas.value) refreshNuxtData('areas')
  if (v) {
    q.value = ''
    browsing.value = place.value?.state ?? null
    nextTick(() => document.getElementById('loc-device')?.focus())
  }
})

interface City { name: string; count: number; areas: Area[] }
interface StateRow { name: string; count: number; cities: City[] }
/** States with their business counts and cities, from the areas list. */
const states = computed<StateRow[]>(() => {
  const byState = new Map<string, StateRow>(NG_STATES.map((s) => [s.name, { name: s.name, count: 0, cities: [] }]))
  for (const a of areas.value ?? []) {
    const st = byState.get(a.state) ?? { name: a.state, count: 0, cities: [] }
    byState.set(a.state, st)
    st.count += a.count
    let city = st.cities.find((c) => c.name.toLowerCase() === a.city.toLowerCase())
    if (!city) st.cities.push((city = { name: a.city, count: 0, areas: [] }))
    city.count += a.count
    city.areas.push(a)
  }
  for (const st of byState.values()) st.cities.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  return [...byState.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
})
const withBusinesses = computed(() => states.value.filter((s) => s.count > 0))
const withoutBusinesses = computed(() => states.value.filter((s) => s.count === 0).sort((a, b) => a.name.localeCompare(b.name)))
const current = computed(() => states.value.find((s) => s.name === browsing.value) ?? null)

// Search across states, cities and neighbourhoods.
const results = computed(() => {
  const t = q.value.trim().toLowerCase()
  if (!t) return null
  const match = (s: string) => s.toLowerCase().includes(t)
  return {
    states: states.value.filter((s) => match(s.name) || match(stateLabel(s.name)) || (s.name === 'FCT' && match('abuja'))),
    cities: states.value.flatMap((s) => s.cities.filter((c) => match(c.name)).map((c) => ({ state: s.name, ...c }))),
    areas: (areas.value ?? []).filter((a) => match(a.area)),
  }
})

const plural = (n: number) => (n ? `${n} ${n === 1 ? 'business' : 'businesses'}` : 'No businesses yet')
const isPlace = (state: string, city?: string) => place.value?.state === state && (place.value?.city ?? '') === (city ?? '')
const isArea = (a: Area) => location.value.source === 'area' && location.value.label === `${a.area}, ${a.city}`

async function pickPlace(state: string, city?: string) {
  await choosePlace({ state, city })
  open.value = false
}
async function pickArea(a: Area) {
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
        class="pb-safe relative flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-paper shadow-2xl lg:max-h-[82vh] lg:w-[480px] lg:rounded-3xl"
      >
        <div class="flex items-center justify-between px-5 pb-2 pt-4">
          <h2 id="loc-title" class="font-display text-xl font-extrabold tracking-tight">Where should we look?</h2>
          <button type="button" aria-label="Close" class="flex size-11 cursor-pointer items-center justify-center rounded-full hover:bg-sand" @click="open = false">
            <AppIcon name="x" />
          </button>
        </div>

        <div class="flex flex-col gap-2 overflow-y-auto px-5 pb-5">
          <div class="grid grid-cols-2 gap-2">
            <button id="loc-device" type="button" class="card flex cursor-pointer flex-col items-start gap-2 p-3 text-left hover:bg-sand" :class="location.source === 'device' ? '!border-palm' : ''" :disabled="locating" @click="device">
              <span class="flex size-9 items-center justify-center rounded-xl bg-palm-tint text-palm"><AppIcon name="target" :size="18" /></span>
              <span class="flex flex-col">
                <span class="text-sm font-bold">{{ locating ? 'Finding you…' : 'Near me' }}</span>
                <span class="text-xs leading-snug text-muted">Closest first. Not saved.</span>
              </span>
            </button>
            <button type="button" class="card flex cursor-pointer flex-col items-start gap-2 p-3 text-left hover:bg-sand" :class="location.source === 'anywhere' ? '!border-palm' : ''" @click="anywhere">
              <span class="flex size-9 items-center justify-center rounded-xl bg-sand text-ink"><AppIcon name="compass" :size="18" /></span>
              <span class="flex flex-col">
                <span class="text-sm font-bold">All Nigeria</span>
                <span class="text-xs leading-snug text-muted">Every state, best rated first</span>
              </span>
            </button>
          </div>
          <p v-if="error" class="px-1 text-[13px] text-danger-ink" role="alert">{{ error }}</p>

          <div class="mt-2 flex h-11 items-center gap-2 rounded-xl border-[1.5px] border-line bg-surface px-3 focus-within:border-palm">
            <AppIcon name="search" :size="18" class="text-muted" />
            <label for="loc-q" class="sr-only">Search states, cities and areas</label>
            <input id="loc-q" v-model="q" type="search" placeholder="Search a state, city or area" class="h-10 min-w-0 flex-1 bg-transparent text-[15px] outline-none" />
          </div>

          <div v-if="status === 'pending' && !areas" class="flex flex-col gap-2 pt-1">
            <div v-for="i in 5" :key="i" class="h-12 animate-pulse rounded-xl bg-sand" />
          </div>

          <!-- Search results -->
          <template v-else-if="results">
            <p v-if="!results.states.length && !results.cities.length && !results.areas.length" class="px-1 py-3 text-sm text-muted">Nothing matches “{{ q }}”.</p>
            <div v-if="results.states.length || results.cities.length" class="card flex flex-col divide-y divide-line-2 overflow-hidden">
              <button v-for="s in results.states" :key="s.name" type="button" class="flex min-h-12 w-full cursor-pointer items-center gap-3 px-3.5 text-left hover:bg-sand" @click="pickPlace(s.name)">
                <span class="flex flex-1 flex-col"><span class="text-[15px] font-bold">{{ stateLabel(s.name) }}</span><span class="text-xs text-muted">State · {{ plural(s.count) }}</span></span>
                <AppIcon v-if="isPlace(s.name)" name="check" :size="18" class="text-palm" />
              </button>
              <button v-for="c in results.cities" :key="`${c.state}/${c.name}`" type="button" class="flex min-h-12 w-full cursor-pointer items-center gap-3 px-3.5 text-left hover:bg-sand" @click="pickPlace(c.state, c.name)">
                <span class="flex flex-1 flex-col"><span class="text-[15px] font-semibold">{{ c.name }}, {{ stateLabel(c.state) }}</span><span class="text-xs text-muted">City · {{ plural(c.count) }}</span></span>
                <AppIcon v-if="isPlace(c.state, c.name)" name="check" :size="18" class="text-palm" />
              </button>
            </div>
            <template v-if="results.areas.length">
              <span class="px-1 pt-2 text-xs font-bold uppercase tracking-wide text-muted">Neighbourhoods · closest first</span>
              <div class="card flex flex-col divide-y divide-line-2 overflow-hidden">
                <button v-for="a in results.areas" :key="`${a.state}/${a.city}/${a.area}`" type="button" class="flex min-h-12 w-full cursor-pointer items-center gap-3 px-3.5 text-left hover:bg-sand" @click="pickArea(a)">
                  <span class="flex-1 text-[15px] font-semibold">{{ a.area }}, {{ a.city }}</span>
                  <span class="text-xs text-muted">{{ plural(a.count) }}</span>
                  <AppIcon v-if="isArea(a)" name="check" :size="18" class="text-palm" />
                </button>
              </div>
            </template>
          </template>

          <!-- One state: its cities and neighbourhoods -->
          <template v-else-if="current">
            <button type="button" class="flex min-h-10 cursor-pointer items-center gap-1 self-start pr-2 text-sm font-bold text-palm" @click="browsing = null">
              <AppIcon name="chevron-left" :size="18" />All states
            </button>
            <div class="card flex flex-col divide-y divide-line-2 overflow-hidden">
              <button type="button" class="flex min-h-[52px] w-full cursor-pointer items-center gap-3 px-3.5 text-left hover:bg-sand" @click="pickPlace(current.name)">
                <span class="flex flex-1 flex-col"><span class="text-[15px] font-bold">All of {{ stateLabel(current.name) }}</span><span class="text-xs text-muted">{{ plural(current.count) }}</span></span>
                <AppIcon v-if="isPlace(current.name)" name="check" :size="18" class="text-palm" />
              </button>
            </div>
            <p v-if="!current.cities.length" class="px-1 py-2 text-sm text-muted">No businesses in {{ stateLabel(current.name) }} yet. Know one? Tell them about Kusa.</p>
            <div v-for="c in current.cities" :key="c.name" class="flex flex-col">
              <span class="px-1 pb-1 pt-2 text-xs font-bold uppercase tracking-wide text-muted">{{ c.name }}</span>
              <div class="card flex flex-col divide-y divide-line-2 overflow-hidden">
                <button type="button" class="flex min-h-12 w-full cursor-pointer items-center gap-3 px-3.5 text-left hover:bg-sand" @click="pickPlace(current.name, c.name)">
                  <span class="flex-1 text-[15px] font-bold">All of {{ c.name }}</span>
                  <span class="text-xs text-muted">{{ plural(c.count) }}</span>
                  <AppIcon v-if="isPlace(current.name, c.name)" name="check" :size="18" class="text-palm" />
                </button>
                <button v-for="a in c.areas" :key="a.area" type="button" class="flex min-h-12 w-full cursor-pointer items-center gap-3 px-3.5 text-left hover:bg-sand" @click="pickArea(a)">
                  <span class="flex flex-1 flex-col"><span class="text-[15px] font-semibold">{{ a.area }}</span><span class="text-xs text-muted">Closest to {{ a.area }} first</span></span>
                  <span class="text-xs text-muted">{{ plural(a.count) }}</span>
                  <AppIcon v-if="isArea(a)" name="check" :size="18" class="text-palm" />
                </button>
              </div>
            </div>
          </template>

          <!-- All states -->
          <template v-else>
            <span class="px-1 pt-2 text-xs font-bold uppercase tracking-wide text-muted">Browse by state</span>
            <div class="card flex flex-col divide-y divide-line-2 overflow-hidden">
              <button v-for="s in withBusinesses" :key="s.name" type="button" class="flex min-h-12 w-full cursor-pointer items-center gap-3 px-3.5 text-left hover:bg-sand" @click="browsing = s.name">
                <span class="flex-1 text-[15px] font-semibold">{{ stateLabel(s.name) }}</span>
                <span class="text-xs text-muted">{{ plural(s.count) }}</span>
                <AppIcon v-if="place?.state === s.name" name="check" :size="18" class="text-palm" />
                <AppIcon name="chevron-right" :size="18" class="text-muted" />
              </button>
            </div>
            <button type="button" class="flex min-h-11 cursor-pointer items-center gap-1 self-start px-1 text-sm font-bold text-palm" :aria-expanded="showAllStates" @click="showAllStates = !showAllStates">
              {{ showAllStates ? 'Hide other states' : `Other states (${withoutBusinesses.length})` }}<AppIcon :name="showAllStates ? 'chevron-down' : 'chevron-right'" :size="16" />
            </button>
            <div v-if="showAllStates" class="card flex flex-col divide-y divide-line-2 overflow-hidden">
              <button v-for="s in withoutBusinesses" :key="s.name" type="button" class="flex min-h-11 w-full cursor-pointer items-center gap-3 px-3.5 text-left hover:bg-sand" @click="browsing = s.name">
                <span class="flex-1 text-[15px] text-ink-2">{{ stateLabel(s.name) }}</span>
                <span class="text-xs text-muted">No businesses yet</span>
              </button>
            </div>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>
