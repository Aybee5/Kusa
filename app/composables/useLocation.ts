import { Capacitor } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'
import { DEFAULT_LOCATION } from '~/services/mock/seed'
import { storage } from '~/utils/storage'

const KEY = 'kusa:location'

interface UserLocation {
  lat: number
  lng: number
  label: string
  source: 'default' | 'device'
}

/** Where "near me" is measured from. Falls back to central Kano. */
export function useLocation() {
  const location = useState<UserLocation>('kusa-location', () => ({ ...DEFAULT_LOCATION, source: 'default' }))
  const locating = useState<boolean>('kusa-locating', () => false)
  const error = useState<string | null>('kusa-location-error', () => null)

  async function load() {
    const saved = await storage.getJSON<UserLocation>(KEY)
    if (saved) location.value = saved
  }

  async function locate() {
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
      location.value = { lat: coords.latitude, lng: coords.longitude, label: 'Your current location', source: 'device' }
      await storage.setJSON(KEY, location.value)
    } catch {
      error.value = 'We couldn’t get your location. Check that location is allowed for Kusa, or keep browsing around central Kano.'
    } finally {
      locating.value = false
    }
  }

  async function reset() {
    location.value = { ...DEFAULT_LOCATION, source: 'default' }
    await storage.remove(KEY)
  }

  const origin = computed(() => ({ lat: location.value.lat, lng: location.value.lng }))

  return { location, origin, locating, error, load, locate, reset }
}
