// One-off: crop existing demo photos (all from Wikimedia Commons, credited in
// public/images/products/CREDITS.md) into category tiles and covers for the
// newer demo businesses, carrying their credits over.
import { readFileSync, writeFileSync } from 'node:fs'
import sharp from 'sharp'

const img = (p) => new URL(`../public/images/${p}`, import.meta.url).pathname
const credits = Object.fromEntries(readFileSync(img('products/CREDITS.md'), 'utf8').split('\n')
  .filter((l) => l.startsWith('| ') && l.includes('.webp'))
  .map((l) => l.split('|').map((c) => c.trim()).slice(1, 5))
  .map(([file, author, licence, source]) => [file, { author, licence, source }]))

const jobs = {
  categories: [
    ['small-chops', 'small-chops-party-pack'], ['quick-meals', 'beef-suya-1-portion'],
    ['drinks', 'zobo-1-litre'], ['cakes', 'red-velvet-cupcakes-6'], ['jewellery', 'bridal-bead-set', 'centre'],
    ['fashion', 'leather-slides'], ['beauty', 'bridal-henna-both-hands'],
  ],
  vendors: [
    ['eko-small-chops-hub', 'event-tray-50-guests'], ['lekki-cakes-by-tolu', 'banana-bread-loaf'],
    ['wuse-kilishi-and-suya', 'chicken-suya-half'], ['zaria-beads-and-crafts', 'beaded-waist-set'],
  ],
}
const size = { categories: [480, 360], vendors: [960, 640] }

for (const [dir, list] of Object.entries(jobs)) {
  const rows = []
  for (const [name, from, position = 'attention'] of list) {
    const [w, h] = size[dir]
    await sharp(img(`products/${from}.webp`)).resize(w, h, { fit: 'cover', position }).webp({ quality: 78 }).toFile(img(`${dir}/${name}.webp`))
    const c = credits[`${from}.webp`]
    rows.push(`| ${name}.webp | ${c.author} | ${c.licence} | ${c.source} |`)
  }
  const path = img(`${dir}/CREDITS.md`)
  let text
  try { text = readFileSync(path, 'utf8') } catch { text = `# ${dir === 'categories' ? 'Category' : 'Business'} photo credits\n\nFrom Wikimedia Commons, resized, cropped and converted to WebP.\n\n| File | Author | Licence | Source |\n| --- | --- | --- | --- |\n` }
  for (const r of rows) {
    const file = r.split('|')[1].trim()
    text = text.split('\n').filter((l) => !l.startsWith(`| ${file} `)).join('\n')
    text = `${text.trimEnd()}\n${r}\n`
  }
  writeFileSync(path, text)
  console.log(`[photos] ${list.length} ${dir} photos`)
}
