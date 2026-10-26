import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

/**
 * Small key-value store. Uses Capacitor Preferences inside the native apps
 * (survives iOS storage clean-ups) and localStorage on the web.
 */
export const storage = {
  async get(key: string): Promise<string | null> {
    if (import.meta.server) return null
    try {
      if (Capacitor.isNativePlatform()) return (await Preferences.get({ key })).value
      return window.localStorage.getItem(key)
    } catch {
      return null
    }
  },
  async set(key: string, value: string): Promise<void> {
    if (import.meta.server) return
    try {
      if (Capacitor.isNativePlatform()) await Preferences.set({ key, value })
      else window.localStorage.setItem(key, value)
    } catch {
      /* storage unavailable (private mode); keep going in memory */
    }
  },
  async remove(key: string): Promise<void> {
    if (import.meta.server) return
    try {
      if (Capacitor.isNativePlatform()) await Preferences.remove({ key })
      else window.localStorage.removeItem(key)
    } catch {
      /* ignore */
    }
  },
  async getJSON<T>(key: string): Promise<T | null> {
    const raw = await this.get(key)
    if (!raw) return null
    try {
      return JSON.parse(raw) as T
    } catch {
      return null
    }
  },
  setJSON(key: string, value: unknown): Promise<void> {
    return this.set(key, JSON.stringify(value))
  },
}
