<script setup lang="ts">
// Map for a vendor to mark where their business is: tap the map or drag the
// pin. Render inside <ClientOnly>.
import type * as Leaflet from 'leaflet'
import type { LatLng } from '#shared/types/api'

const props = defineProps<{ center: LatLng }>()
const model = defineModel<LatLng | null>({ required: true })

let L: typeof Leaflet
let map: Leaflet.Map | null = null
let marker: Leaflet.Marker | null = null
const el = useTemplateRef<HTMLDivElement>('pinEl')

const pinIcon = () => L.divIcon({
  className: '',
  html: '<svg width="36" height="36" viewBox="0 0 24 24" style="transform:translate(-50%,-100%);display:block;filter:drop-shadow(0 2px 3px rgba(0,0,0,.3))"><path fill="#0B6E4F" d="M12 22s-7.5-6.4-7.5-12.2A7.5 7.5 0 0 1 19.5 9.8C19.5 15.6 12 22 12 22z"/><circle cx="12" cy="9.8" r="3" fill="#fff"/></svg>',
  iconAnchor: [0, 0],
})

function place(p: LatLng, pan = false) {
  if (!map) return
  if (!marker) {
    marker = L.marker([p.lat, p.lng], { icon: pinIcon(), draggable: true, keyboard: true, title: 'Your business' }).addTo(map)
    marker.on('dragend', () => {
      const ll = marker!.getLatLng()
      model.value = { lat: +ll.lat.toFixed(6), lng: +ll.lng.toFixed(6) }
    })
  } else marker.setLatLng([p.lat, p.lng])
  if (pan) map.setView([p.lat, p.lng], Math.max(map.getZoom(), 16))
}

onMounted(async () => {
  L = await import('leaflet')
  if (!el.value) return
  const start = model.value ?? props.center
  map = L.map(el.value, { zoomControl: false }).setView([start.lat, start.lng], model.value ? 16 : 14)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map)
  L.control.zoom({ position: 'bottomright' }).addTo(map)
  if (model.value) place(model.value)
  map.on('click', (e: Leaflet.LeafletMouseEvent) => {
    model.value = { lat: +e.latlng.lat.toFixed(6), lng: +e.latlng.lng.toFixed(6) }
  })
})

watch(model, (p) => p && place(p, true))
watch(() => props.center, (c) => {
  if (!model.value && map) map.setView([c.lat, c.lng], 14)
})

onBeforeUnmount(() => {
  map?.remove()
  map = null
  marker = null
})
</script>

<template>
  <div ref="pinEl" class="size-full bg-[#ECE6D8]" role="application" aria-label="Map: tap where your business is, or drag the pin" />
</template>
