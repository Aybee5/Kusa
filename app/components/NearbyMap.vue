<script setup lang="ts">
// Always render inside <ClientOnly>: Leaflet needs the browser.
import type * as Leaflet from 'leaflet'
import type { VendorWithMeta } from '~/types'

let L: typeof Leaflet

const props = defineProps<{
  vendors: VendorWithMeta[]
  origin: { lat: number; lng: number }
  radiusKm: number
  activeId?: string | null
}>()
const emit = defineEmits<{ select: [id: string] }>()

const el = useTemplateRef<HTMLDivElement>('mapEl')
let map: Leaflet.Map | null = null
let layer: Leaflet.LayerGroup | null = null

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

function draw() {
  if (!map || !layer) return
  layer.clearLayers()
  if (props.radiusKm) {
    L.circle([props.origin.lat, props.origin.lng], {
      radius: props.radiusKm * 1000, color: '#0B6E4F', weight: 2, dashArray: '6 6', fillColor: '#0B6E4F', fillOpacity: 0.06,
    }).addTo(layer)
  }
  L.circleMarker([props.origin.lat, props.origin.lng], {
    radius: 8, color: '#FFFFFF', weight: 3, fillColor: '#2A64C9', fillOpacity: 1,
  }).bindTooltip('You are here').addTo(layer)

  for (const v of props.vendors) {
    const active = v.id === props.activeId
    const short = escapeHtml(v.name.split(' ').slice(0, 2).join(' '))
    const rating = v.rating.count ? ` · ★${v.rating.average.toFixed(1)}` : ''
    const icon = L.divIcon({
      className: '',
      html: `<span class="kusa-pin${active ? ' is-active' : ''}">${short}${rating}</span>`,
      iconSize: undefined,
      iconAnchor: [0, 0],
    })
    L.marker([v.lat, v.lng], { icon, title: v.name, keyboard: true })
      .on('click', () => emit('select', v.id))
      .addTo(layer)
  }

  const points: Leaflet.LatLngExpression[] = [[props.origin.lat, props.origin.lng], ...props.vendors.map((v) => [v.lat, v.lng] as Leaflet.LatLngTuple)]
  if (props.radiusKm && props.vendors.length) {
    map.fitBounds(L.latLng(props.origin.lat, props.origin.lng).toBounds(props.radiusKm * 2000), { padding: [16, 16] })
  } else if (points.length > 1) {
    map.fitBounds(L.latLngBounds(points), { padding: [32, 32], maxZoom: 15 })
  } else {
    map.setView([props.origin.lat, props.origin.lng], 14)
  }
}

onMounted(async () => {
  L = await import('leaflet')
  if (!el.value) return
  map = L.map(el.value, { zoomControl: false, attributionControl: true }).setView([props.origin.lat, props.origin.lng], 14)
  // OpenStreetMap tiles are fine for development. Switch to a commercial tile
  // provider (MapTiler, Mapbox, Stadia…) before launch: see README.
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap',
  }).addTo(map)
  L.control.zoom({ position: 'bottomright' }).addTo(map)
  layer = L.layerGroup().addTo(map)
  draw()
})

watch(() => [props.vendors, props.origin, props.radiusKm, props.activeId], draw, { deep: true })

defineExpose({ invalidate: () => setTimeout(() => map?.invalidateSize(), 50) })

onBeforeUnmount(() => {
  map?.remove()
  map = null
})
</script>

<template>
  <div ref="mapEl" class="size-full bg-[#ECE6D8]" role="region" aria-label="Map of nearby businesses" />
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
