import { storage } from '~/utils/storage'

const KEY = 'kusa:saved'

/** Businesses the shopper has saved, kept on the device. */
export function useSaved() {
  const ids = useState<string[]>('kusa-saved', () => [])

  async function load() {
    ids.value = (await storage.getJSON<string[]>(KEY)) ?? []
  }

  function isSaved(id: string) {
    return ids.value.includes(id)
  }

  async function toggle(id: string) {
    ids.value = isSaved(id) ? ids.value.filter((x) => x !== id) : [...ids.value, id]
    await storage.setJSON(KEY, ids.value)
  }

  return { ids, load, isSaved, toggle }
}
