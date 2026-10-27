import { Capacitor } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'
import type { Area, LatLng } from '#shared/types/api'
import { DEFAULT_LOCATION } from '#shared/utils/catalog'
import { stateLabel } from '#shared/utils/states'
import { storage } from '~/utils/storage'

const KEY = 'kusa:location'

export type LocationSource = 'default' | 'device' | 'area' | 'map' | 'anywhere' | 'place'

/** A state, or a city in a state, to browse without a location. */
export interface Place { state: string; city?: string }

export interface UserLocation {
  lat: number
  lng: number
  label: string
  source: LocationSource
  /** Set when source is "place". */
  place?: Place
}

export const placeLabel = (p: Place) => (p.city ? `${p.city}, ${stateLabel(p.state)}` : stateLabel(p.state))

/**
 * Where "near me" is measured from. Shoppers can share their location, pick
 * a neighbourhood, search the part of the map they're looking at, browse a
 * state or city (like a classifieds site, no location needed), or browse all
 * of Nigeria without distances. Until they choose, results are sorted from a default
 * area. The choice stays on the device; the server only receives the point
 * with each search and doesn't store it.
 */
export function useLocation() {
  const location = useState<UserLocation>('kusa-location', () => ({ ...DEFAULT_LOCATION, source: 'default' }))
  const locating = useState<boolean>('kusa-locating', () => false)
  const error = useState<string | null>('kusa-location-error', () => null)

  async function load() {
    const saved = await storage.getJSON<UserLocation>(KEY)
    if (saved?.source) location.value = saved
  }

  async function set(next: UserLocation) {
    location.value = next
    error.value = null
    if (next.source === 'default') await storage.remove(KEY)
    else await storage.setJSON(KEY, next)
  }

  /** Ask for the device location. Returns the point, or null if it wasn't shared. */
  async function locate(): Promise<LatLng | null> {
    locating.value = true
    error.value = null
    try {
      let coords: { latitude: number; longitude: number }
      if (Capacitor.isNativePlatform()) {
        const perm = await Geolocation.requestPermissions({ permissions: ['location'] })
        if (perm.location === 'denied') throw new Error('denied')
        coords = (await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 10000 })).coords
      } else {
        coords = await new Promise((resolve, reject) => {
          if (!navigator.geolocation) return reject(new Error('unsupported'))
          navigator.geolocation.getCurrentPosition((p) => resolve(p.coords), reject, { timeout: 10000, maximumAge: 300000 })
        })
      }
      await set({ lat: coords.latitude, lng: coords.longitude, label: 'Your current location', source: 'device' })
      return { lat: coords.latitude, lng: coords.longitude }
    } catch {
      error.value = 'We couldn’t get your location. You can allow location for Kusa in your settings, or pick an area below instead.'
      return null
    } finally {
      locating.value = false
    }
  }

  const chooseArea = (a: Area) => set({ lat: a.lat, lng: a.lng, label: `${a.area}, ${a.city}`, source: 'area' })
  const choosePoint = (p: LatLng, label = 'Map area') => set({ ...p, label, source: 'map' })
  const browseAnywhere = () => set({ ...location.value, label: 'All Nigeria', source: 'anywhere', place: undefined })
  /** Browse one state, or a city in it: only businesses there, best rated first. */
  const choosePlace = (p: Place) => set({ ...location.value, label: placeLabel(p), source: 'place', place: { state: p.state, ...(p.city ? { city: p.city } : {}) } })
  const reset = () => set({ ...DEFAULT_LOCATION, source: 'default' })

  /** The point searches are measured from, or null when browsing a place or all of Nigeria. */
  const origin = computed<LatLng | null>(() =>
    location.value.source === 'anywhere' || location.value.source === 'place' ? null : { lat: location.value.lat, lng: location.value.lng },
  )
  /** The state (and city) being browsed, if any. */
  const place = computed<Place | null>(() => (location.value.source === 'place' ? location.value.place ?? null : null))

  return { location, origin, place, locating, error, load, locate, chooseArea, choosePoint, browseAnywhere, choosePlace, reset }
}
