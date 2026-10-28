import index from '../photo-index.json'

const available = new Set<string>(index)

/** The URL of a photo in public/images if it exists (see scripts/photo-index.mjs). */
export function photoIfExists(path: string): string | undefined {
  return available.has(path) ? path : undefined
}

/** File name used for demo photos: "Kilishi, 250 g" → "kilishi-250-g". */
export const photoSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

/** Category tile photo, e.g. /images/categories/small-chops.webp. */
export const categoryPhoto = (id: string) => photoIfExists(`/images/categories/${id}.webp`)
