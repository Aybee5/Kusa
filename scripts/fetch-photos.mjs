// Fetch demo photos from Wikimedia Commons (freely licensed only), crop them to
// size, save as WebP in public/images and record the credits.
//
//   npm run photos:fetch -- --candidates            save up to 4 candidates per photo in .photo-candidates/ to look at
//   npm run photos:fetch -- --pick categories/drinks.webp=2 [more…]   use a candidate
//   npm run photos:fetch                             fetch photos that have a pinned "file" in scripts/photo-manifest.json
//   add --only <path> to limit to one photo
//
// Needs internet access to commons.wikimedia.org and upload.wikimedia.org.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { execFileSync } from 'node:child_process'
import sharp from 'sharp'

const API = process.env.COMMONS_API ?? 'https://commons.wikimedia.org/w/api.php'
const UA = 'KusaDemoPhotos/1.0 (https://github.com/Aybee5/Kusa)'
const ROOT = new URL('..', import.meta.url).pathname
const CANDIDATES = `${ROOT}.photo-candidates`
const manifest = JSON.parse(readFileSync(`${ROOT}scripts/photo-manifest.json`, 'utf8'))
const args = process.argv.slice(2)
const flag = (name) => args.includes(`--${name}`)
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null
const picks = Object.fromEntries(args.filter((a) => /\.webp=\d+$/.test(a)).map((a) => a.split('=')).map(([p, n]) => [p, Number(n)]))

// Licences that allow reuse with credit.
const FREE = /^(cc0|cc[- ]by(-sa)?[- ][\d.]+|cc[- ]by(-sa)?|public domain|pd(-\w+)?)/i
const strip = (html = '') => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', formatversion: '2', origin: '*', ...params })}`
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`Commons API ${res.status}`)
  return res.json()
}

const toInfo = (page) => {
  const ii = page.imageinfo?.[0]
  if (!ii) return null
  const meta = ii.extmetadata ?? {}
  return {
    title: page.title,
    width: ii.width, height: ii.height, mime: ii.mime,
    thumb: ii.thumburl ?? ii.url,
    licence: strip(meta.LicenseShortName?.value) || '',
    author: strip(meta.Artist?.value) || 'Unknown',
    source: ii.descriptionurl ?? `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
  }
}
const usable = (i, [w]) => i && /jpeg|png|webp/.test(i.mime) && i.width >= w * 0.9 && FREE.test(i.licence) && !/nonfree|fair use/i.test(i.licence)

const IMAGE_PROPS = { prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '1400' }

async function search(entry, limit = 4) {
  const found = []
  for (const q of entry.queries) {
    const data = await api({ action: 'query', generator: 'search', gsrsearch: `${q} filetype:bitmap`, gsrnamespace: '6', gsrlimit: '20', ...IMAGE_PROPS })
    const pages = (data.query?.pages ?? []).sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    for (const p of pages) {
      const info = toInfo(p)
      if (usable(info, entry.size) && !found.some((f) => f.title === info.title)) found.push(info)
      if (found.length >= limit) return found
    }
  }
  return found
}

async function fileInfo(title) {
  const data = await api({ action: 'query', titles: title, ...IMAGE_PROPS })
  const info = toInfo(data.query?.pages?.[0] ?? {})
  if (!info) throw new Error(`${title} not found on Commons`)
  if (!FREE.test(info.licence)) throw new Error(`${title}: licence "${info.licence}" isn't a free licence`)
  return info
}

async function download(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`download ${res.status} ${url}`)
  return Buffer.from(await res.arrayBuffer())
}

function credit(path, info) {
  const [dir, file] = path.split('/')
  const creditsPath = `${ROOT}public/images/${dir}/CREDITS.md`
  const title = { categories: 'Category', vendors: 'Business', products: 'Product' }[dir] ?? 'Photo'
  let text = existsSync(creditsPath) ? readFileSync(creditsPath, 'utf8')
    : `# ${title} photo credits\n\nFrom Wikimedia Commons, resized, cropped and converted to WebP.\n\n| File | Author | Licence | Source |\n| --- | --- | --- | --- |\n`
  text = text.split('\n').filter((l) => !l.startsWith(`| ${file} `)).join('\n').trimEnd()
  writeFileSync(creditsPath, `${text}\n| ${file} | ${info.author.replace(/\|/g, '/')} | ${info.licence} | ${info.source} |\n`)
}

async function save(entry, info) {
  const out = `${ROOT}public/images/${entry.path}`
  mkdirSync(dirname(out), { recursive: true })
  const [w, h] = entry.size
  await sharp(await download(info.thumb)).resize(w, h, { fit: 'cover', position: 'attention' }).webp({ quality: 78 }).toFile(out)
  credit(entry.path, info)
  console.log(`✓ ${entry.path}  ←  ${info.title} (${info.licence}, ${info.author})`)
}

const entries = manifest.photos.filter((e) => !only || e.path === only)

if (flag('candidates')) {
  mkdirSync(CANDIDATES, { recursive: true })
  const all = {}
  for (const e of entries) {
    const list = await search(e)
    all[e.path] = list
    for (const [n, info] of list.entries()) {
      const file = `${CANDIDATES}/${e.path.replace(/[/.]/g, '_')}-${n + 1}.jpg`
      await sharp(await download(info.thumb)).resize(e.size[0], e.size[1], { fit: 'cover', position: 'attention' }).jpeg({ quality: 80 }).toFile(file)
    }
    console.log(`${e.path}: ${list.length ? list.map((c, n) => `\n  ${n + 1}. ${c.title} · ${c.licence} · ${c.author}`).join('') : ' no free-licence results; try other queries'}`)
  }
  writeFileSync(`${CANDIDATES}/candidates.json`, JSON.stringify(all, null, 2))
  console.log(`\nCandidates are in .photo-candidates/. Choose with: npm run photos:fetch -- --pick <path>=<number>`)
} else if (Object.keys(picks).length) {
  const all = JSON.parse(readFileSync(`${CANDIDATES}/candidates.json`, 'utf8'))
  for (const [path, n] of Object.entries(picks)) {
    const entry = manifest.photos.find((e) => e.path === path)
    const info = all[path]?.[n - 1]
    if (!entry || !info) throw new Error(`No candidate ${n} for ${path}; run --candidates first`)
    await save(entry, info)
  }
} else {
  const pinned = entries.filter((e) => e.file)
  if (!pinned.length) console.log('No photos have a pinned "file". Use --candidates to look for some.')
  for (const e of pinned) await save(e, await fileInfo(e.file))
}

if (!flag('candidates')) execFileSync('node', [`${ROOT}scripts/photo-index.mjs`], { stdio: 'inherit' })
