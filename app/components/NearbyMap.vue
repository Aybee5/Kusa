<script setup lang="ts">
// Always render inside <ClientOnly>: Leaflet needs the browser.
import type * as Leaflet from 'leaflet'
import type { VendorWithMeta } from '#shared/types'
import type { LatLng } from '#shared/types/api'

let L: typeof Leaflet

const props = defineProps<{
  vendors: VendorWithMeta[]
  /** Search centre; null when browsing anywhere. */
  origin: LatLng | null
  /** True when the centre is the shopper's own location. */
  isDevice?: boolean
  radiusKm: number
  activeId?: string | null
}>()
const emit = defineEmits<{ select: [id: string]; moved: [center: LatLng] }>()

const el = useTemplateRef<HTMLDivElement>('mapEl')
let map: Leaflet.Map | null = null
let layer: Leaflet.LayerGroup | null = null
let fitting = false

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

function drawMarkers() {
  if (!map || !layer) return
  layer.clearLayers()
  const o = props.origin
  if (o && props.radiusKm) {
    L.circle([o.lat, o.lng], {
      radius: props.radiusKm * 1000, color: '#0B6E4F', weight: 2, dashArray: '6 6', fillColor: '#0B6E4F', fillOpacity: 0.06, interactive: false,
    }).addTo(layer)
  }
  if (o) {
    L.circleMarker([o.lat, o.lng], { radius: 8, color: '#FFFFFF', weight: 3, fillColor: '#2A64C9', fillOpacity: 1 })
      .bindTooltip(props.isDevice ? 'You are here' : 'Search centre')
      .addTo(layer)
  }
  for (const v of props.vendors) {
    const active = v.id === props.activeId
    const short = escapeHtml(v.name.split(' ').slice(0, 2).join(' '))
    const rating = v.rating.count ? ` · ★${v.rating.average.toFixed(1)}` : ''
    const icon = L.divIcon({ className: '', html: `<span class="kusa-pin${active ? ' is-active' : ''}">${short}${rating}</span>`, iconAnchor: [0, 0] })
    L.marker([v.lat, v.lng], { icon, title: v.name, keyboard: true, zIndexOffset: active ? 1000 : 0 })
      .on('click', () => emit('select', v.id))
      .addTo(layer)
  }
}

function fit() {
  if (!map) return
  const o = props.origin
  fitting = true
  const points: Leaflet.LatLngTuple[] = props.vendors.map((v) => [v.lat, v.lng])
  if (o) points.push([o.lat, o.lng])
  if (o && props.radiusKm) map.fitBounds(L.latLng(o.lat, o.lng).toBounds(props.radiusKm * 2000), { padding: [16, 16] })
  else if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [32, 32], maxZoom: 15 })
  else if (points.length === 1) map.setView(points[0]!, 14)
  else map.setView([11.9965, 8.531], 6)
  setTimeout(() => (fitting = false), 400)
}

onMounted(async () => {
  L = await import('leaflet')
  if (!el.value) return
  map = L.map(el.value, { zoomControl: false, attributionControl: true })
  // OpenStreetMap tiles are fine for development. Switch to a commercial tile
  // provider (MapTiler, Mapbox, Stadia…) before launch: see README.
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map)
  L.control.zoom({ position: 'bottomright' }).addTo(map)
  layer = L.layerGroup().addTo(map)
  drawMarkers()
  fit()
  // Tell the page when the shopper pans or zooms, so it can offer "Search this area".
  map.on('moveend', () => {
    if (fitting || !map) return
    const c = map.getCenter()
    emit('moved', { lat: +c.lat.toFixed(5), lng: +c.lng.toFixed(5) })
  })
})

watch(() => [props.vendors, props.activeId, props.isDevice], drawMarkers, { deep: true })
watch(() => [props.vendors.map((v) => v.id).join(), props.origin?.lat, props.origin?.lng, props.radiusKm], () => {
  drawMarkers()
  fit()
})

defineExpose({ invalidate: () => setTimeout(() => map?.invalidateSize(), 50) })

onBeforeUnmount(() => {
  map?.remove()
  map = null
})
</script>

<template>
  <div ref="mapEl" class="size-full bg-[#ECE6D8]" role="region" aria-label="Map of businesses" />
</template>

<style>
.kusa-pin {
  display: inline-block;
  transform: translate(-50%, -100%);
  white-space: nowrap;
  padding: 5px 9px;
  border-radius: 999px;
  background: #ffffff;
  color: #16211b;
  font: 700 12px/1.2 var(--font-sans);
  box-shadow: 0 4px 10px rgba(22, 33, 27, 0.18);
  cursor: pointer;
}
.kusa-pin.is-active {
  background: #0b6e4f;
  color: #ffffff;
}
.leaflet-container {
  font-family: var(--font-sans);
}
</style>
