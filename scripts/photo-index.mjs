// Lists the photos in public/images into shared/photo-index.json, so the demo
// data and the category tiles only use photos that exist.
// Run after adding or removing photos: npm run photos:index
import { readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = new URL('../public', import.meta.url).pathname
const out = new URL('../shared/photo-index.json', import.meta.url).pathname
const files = []
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p)
    else if (/\.(webp|jpe?g|png)$/i.test(name)) files.push(`/${relative(root, p)}`)
  }
}
walk(join(root, 'images'))
files.sort()
writeFileSync(out, `${JSON.stringify(files, null, 2)}\n`)
console.log(`[photos] ${files.length} photos listed in shared/photo-index.json`)
