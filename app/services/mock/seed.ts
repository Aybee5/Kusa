// Demo data for running Kusa without a backend. Every business, person,
// price and number in here is made up.
import type { Product, Review, Shopper, Vendor, VendorStats, DailyStat } from '~/types'

export const DEFAULT_LOCATION = {
  lat: 11.9965,
  lng: 8.531,
  label: 'Nassarawa GRA, Kano',
}

const at = (dLatKm: number, dLngKm: number) => ({
  lat: +(DEFAULT_LOCATION.lat + dLatKm * 0.00904).toFixed(5),
  lng: +(DEFAULT_LOCATION.lng + dLngKm * 0.00919).toFixed(5),
})

const hours = (opens: string, closes: string, closedDays: number[] = []) => ({ opens, closes, closedDays })
const docs = (idType = 'NIN slip', hasSelfie = true, hasBusinessProof = true) => ({ idType, hasSelfie, hasBusinessProof })

export const vendors: Vendor[] = [
  {
    id: 'v1', slug: 'mama-hadiza-small-chops', name: 'Mama Hadiza Small Chops', ownerName: 'Hadiza Umar',
    phone: '+2348030004417', whatsapp: '2348030004417', category: 'small-chops', area: 'Tarauni', city: 'Kano',
    landmark: 'Beside Tarauni market', ...at(-0.9, 0.7), status: 'verified', hours: hours('09:00', '20:00'),
    delivery: true, pickup: true, initials: 'MH', tint: '#F4B740', coverTint: '#F6E3C8', joinedAt: '2026-09-03',
    about: 'Home-made small chops for parties, naming ceremonies and office events. Order a day ahead for packs over 50 pieces.',
    documents: docs(),
  },
  {
    id: 'v2', slug: 'zainab-beads', name: 'Zainab Beads & Co.', ownerName: 'Zainab Lawan',
    phone: '+2348060002210', whatsapp: '2348060002210', category: 'jewellery', area: 'Gyadi-Gyadi', city: 'Kano',
    landmark: 'Near the roundabout', ...at(-1.6, -1.1), status: 'pending', hours: hours('10:00', '18:30', [0]),
    delivery: true, pickup: true, initials: 'ZB', tint: '#E4E1F2', coverTint: '#E4E1F2', joinedAt: '2026-10-22', submittedAt: '2026-10-22',
    about: 'Hand-made beaded necklaces, waist beads and bridal sets.', documents: docs('NIN slip', true, true),
  },
  {
    id: 'v3', slug: 'suya-spot-by-musa', name: 'Suya Spot by Musa', ownerName: 'Musa Abdullahi',
    phone: '+2348050003302', whatsapp: '2348050003302', category: 'quick-meals', area: 'Zoo Road', city: 'Kano',
    ...at(1.8, 1.9), status: 'verified', hours: hours('16:00', '23:00'), delivery: true, pickup: true,
    initials: 'SS', tint: '#F3D6CC', coverTint: '#F3D6CC', joinedAt: '2026-08-28',
    about: 'Beef and chicken suya grilled fresh every evening. Kilishi available on request.', documents: docs("Driver's licence"),
  },
  {
    id: 'v4', slug: 'crunch-and-co', name: 'Crunch & Co.', ownerName: 'Ngozi Okafor',
    phone: '+2348160001190', whatsapp: '2348160001190', category: 'snacks', area: 'Nassarawa GRA', city: 'Kano',
    ...at(0.5, -0.6), status: 'verified', hours: hours('08:00', '19:00', [0]), delivery: false, pickup: true,
    initials: 'CC', tint: '#F4ECC4', coverTint: '#F4ECC4', joinedAt: '2026-08-14',
    about: 'Chin chin, plantain chips and coconut candy in jars and party packs.', documents: docs(),
  },
  {
    id: 'v5', slug: 'kunu-and-zobo-hub', name: 'Kunu & Zobo Hub', ownerName: 'Aisha Bello',
    phone: '+2348130000954', whatsapp: '2348130000954', category: 'drinks', area: 'Hotoro', city: 'Kano',
    ...at(-0.4, 3.2), status: 'pending', hours: hours('08:00', '18:00'), delivery: true, pickup: true,
    initials: 'KZ', tint: '#F1D3DA', coverTint: '#F1D3DA', joinedAt: '2026-10-21', submittedAt: '2026-10-21',
    about: 'Fresh zobo, kunun aya and kunun gyada in 50cl and 1 litre bottles.', documents: docs("Voter's card", true, false),
  },
  {
    id: 'v6', slug: 'fatimas-cakes', name: "Fatima's Cakes", ownerName: 'Fatima Sani',
    phone: '+2349020007781', whatsapp: '2349020007781', category: 'cakes', area: 'Kabuga', city: 'Kano',
    ...at(-2.4, -2.0), status: 'pending', hours: hours('09:00', '19:00', [5]), delivery: true, pickup: false,
    initials: 'FC', tint: '#FBE7D9', coverTint: '#FBE7D9', joinedAt: '2026-10-20', submittedAt: '2026-10-20',
    about: 'Birthday and wedding cakes, cupcakes and small chops add-ons.', documents: docs('International passport', false, false),
  },
  {
    id: 'v7', slug: 'bite-box-kano', name: 'Bite Box Kano', ownerName: 'Ibrahim Yusuf',
    phone: '+2348090005521', whatsapp: '2348090005521', category: 'small-chops', area: 'Gyadi-Gyadi', city: 'Kano',
    ...at(-1.5, -1.2), status: 'verified', hours: hours('10:00', '19:00'), delivery: true, pickup: false,
    initials: 'BB', tint: '#FBE7D9', coverTint: '#FBE7D9', joinedAt: '2026-09-12',
    about: 'Small chops boxes for offices and events, delivered across Kano.', documents: docs(),
  },
  {
    id: 'v8', slug: 'iya-bisis-kitchen', name: "Iya Bisi's Kitchen", ownerName: 'Bisi Adeyemi',
    phone: '+2348070004410', whatsapp: '2348070004410', category: 'small-chops', area: 'Zoo Road', city: 'Kano',
    ...at(1.9, 1.9), status: 'verified', hours: hours('09:00', '21:00'), delivery: true, pickup: true,
    initials: 'IB', tint: '#F3D6CC', coverTint: '#F3D6CC', joinedAt: '2026-09-01',
    about: 'Puff-puff, buns, samosa and asun. Party trays for 20 to 200 guests.', documents: docs(),
  },
  {
    id: 'v9', slug: 'kano-kicks', name: 'Kano Kicks', ownerName: 'Yusuf Garba',
    phone: '+2347080006623', whatsapp: '2347080006623', category: 'fashion', area: 'Bompai', city: 'Kano',
    ...at(2.6, 2.3), status: 'verified', hours: hours('10:00', '20:00', [0]), delivery: true, pickup: true,
    initials: 'KK', tint: '#D9EBE6', coverTint: '#D9EBE6', joinedAt: '2026-07-30',
    about: 'Sneakers, slides and caps. New stock every Friday.', documents: docs(),
  },
  {
    id: 'v10', slug: 'glow-by-amina', name: 'Glow by Amina', ownerName: 'Amina Yakubu',
    phone: '+2349090005048', whatsapp: '2349090005048', category: 'beauty', area: 'Sabon Gari', city: 'Kano',
    ...at(2.1, 0.4), status: 'suspended', suspensionReason: 'Reports of non-delivery', hours: hours('10:00', '19:00'),
    delivery: true, pickup: true, initials: 'GA', tint: '#EFE0EC', coverTint: '#EFE0EC', joinedAt: '2026-08-02',
    about: 'Shea butter, black soap and skincare sets.', documents: docs(),
  },
  {
    id: 'v11', slug: 'amal-jewels', name: 'Amal Jewels', ownerName: 'Amal Idris',
    phone: '+2348140003390', whatsapp: '2348140003390', category: 'jewellery', area: 'Sharada', city: 'Kano',
    ...at(-1.2, -1.6), status: 'verified', hours: hours('10:00', '18:30', [0]), delivery: true, pickup: true,
    initials: 'AJ', tint: '#E4E1F2', coverTint: '#E4E1F2', joinedAt: '2026-08-19',
    about: 'Beaded necklaces, gold-plated earrings and bridal sets made to order.', documents: docs(),
  },
  {
    id: 'v12', slug: 'sweet-crumbs-bakery', name: 'Sweet Crumbs Bakery', ownerName: 'Maryam Aliyu',
    phone: '+2348100008812', whatsapp: '2348100008812', category: 'cakes', area: 'Nassarawa GRA', city: 'Kano',
    ...at(1.1, -1.0), status: 'verified', hours: hours('08:00', '18:00', [5]), delivery: true, pickup: true,
    initials: 'SC', tint: '#FBE7D9', coverTint: '#FBE7D9', joinedAt: '2026-09-20',
    about: 'Cupcakes, banana bread and celebration cakes. Two days notice for custom cakes.', documents: docs(),
  },
  {
    id: 'v13', slug: 'zobo-republic', name: 'Zobo Republic', ownerName: 'Halima Garba',
    phone: '+2348120006671', whatsapp: '2348120006671', category: 'drinks', area: 'Gwammaja', city: 'Kano',
    ...at(1.4, 0.6), status: 'verified', hours: hours('09:00', '20:00'), delivery: true, pickup: true,
    initials: 'ZR', tint: '#F1D3DA', coverTint: '#F1D3DA', joinedAt: '2026-09-08',
    about: 'Chilled zobo, tiger nut drink and fresh juice by the bottle or keg.', documents: docs(),
  },
  {
    id: 'v14', slug: 'henna-by-rahma', name: 'Henna by Rahma', ownerName: 'Rahma Bashir',
    phone: '+2348150002267', whatsapp: '2348150002267', category: 'beauty', area: 'Kofar Mata', city: 'Kano',
    ...at(1.2, -1.8), status: 'verified', hours: hours('09:00', '18:00'), delivery: false, pickup: true,
    initials: 'HR', tint: '#EFE0EC', coverTint: '#EFE0EC', joinedAt: '2026-09-15',
    about: 'Bridal and party henna at home or at the studio. Book a day ahead.', documents: docs(),
  },
]

// Demo cover photos are in public/images/vendors, named after the slug
// (credits in CREDITS.md there).
for (const v of vendors) v.cover = `/images/vendors/${v.slug}.webp`

let pid = 0
// Demo photos are in public/images/products, named after the product
// (credits in CREDITS.md there).
const photo = (name: string) => `/images/products/${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}.webp`
const p = (vendorId: string, name: string, price: number, tint: string, photoLabel: string, description: string, extra: Partial<Product> = {}): Product => ({
  id: `p${++pid}`, vendorId, name, price, tint, photoLabel, image: photo(name), description, tags: [], available: true,
  createdAt: '2026-10-01', ...extra,
})

export const products: Product[] = [
  p('v1', 'Small chops party pack', 18000, '#F6E3C8', 'Party pack tray',
    'Puff-puff, samosa, spring rolls and peppered gizzard in a sealed tray. Good for parties, naming ceremonies and office events.',
    { options: [{ label: '25 pcs', price: 9500 }, { label: '50 pcs', price: 18000 }, { label: '100 pcs', price: 34000 }], tags: ['Order 24 hrs ahead'], createdAt: '2026-10-20' }),
  p('v1', 'Puff-puff, 20 pieces', 2000, '#F4ECC4', 'Puff-puff', 'Soft, golden puff-puff fried to order.'),
  p('v1', 'Samosa & spring roll box', 4500, '#FBE7D9', 'Samosa box', '10 samosas and 10 spring rolls with chilli dip.', { available: false }),
  p('v1', 'Peppered gizzard, 1 plate', 3000, '#F3D6CC', 'Peppered gizzard', 'Spicy fried gizzard with onions and peppers.'),
  p('v3', 'Beef suya, 1 portion', 2500, '#F3D6CC', 'Beef suya', 'Thin-sliced beef with yaji, onions and tomatoes.'),
  p('v3', 'Chicken suya, half', 6000, '#F6E3C8', 'Chicken suya', 'Half chicken grilled with yaji.'),
  p('v3', 'Kilishi, 250 g', 5500, '#FBE7D9', 'Kilishi pack', 'Sun-dried spiced beef, sealed pack.', { createdAt: '2026-10-18' }),
  p('v4', 'Chin chin jar, 1 litre', 3500, '#F4ECC4', 'Chin chin jar', 'Crunchy milk chin chin in a resealable jar.', { createdAt: '2026-10-24' }),
  p('v4', 'Plantain chips, 6 packs', 3000, '#F6E3C8', 'Plantain chips', 'Lightly salted ripe and unripe plantain chips.'),
  p('v4', 'Coconut candy, 10 pieces', 1200, '#FBE7D9', 'Coconut candy', 'Chewy caramelised coconut candy.'),
  p('v7', 'Office small chops box', 2500, '#FBE7D9', 'Office box', 'One-person box: 2 samosas, 2 spring rolls, puff-puff and a drink.'),
  p('v7', 'Event tray, 50 guests', 45000, '#F6E3C8', 'Event tray', 'Mixed small chops for 50 guests with serving trays.'),
  p('v8', 'Puff-puff and buns tray', 5000, '#F4ECC4', 'Puff-puff tray', '40 pieces of puff-puff and buns.'),
  p('v8', 'Asun, 1 plate', 4000, '#F3D6CC', 'Asun', 'Spicy grilled goat meat.'),
  p('v9', 'White classic sneakers', 28000, '#D9EBE6', 'Sneakers', 'Sizes 39 to 45. Ask for stock on WhatsApp.'),
  p('v9', 'Leather slides', 12000, '#ECE6D8', 'Slides', 'Hand-stitched leather slides, black or brown.'),
  p('v11', 'Beaded waist set', 6000, '#E4E1F2', 'Waist beads', 'Set of three waist bead strands in your colours.', { createdAt: '2026-10-23' }),
  p('v11', 'Bridal bead set', 45000, '#EFE0EC', 'Bridal set', 'Necklace, bracelet and earrings, made to order in 5 days.'),
  p('v11', 'Gold-plated hoops', 8500, '#F4ECC4', 'Hoop earrings', 'Light, hypoallergenic gold-plated hoops.'),
  p('v12', 'Red velvet cupcakes, 6', 7500, '#FBE7D9', 'Cupcakes', 'Six red velvet cupcakes with cream cheese frosting.', { createdAt: '2026-10-22' }),
  p('v12', 'Banana bread loaf', 4000, '#F4ECC4', 'Banana bread', 'Moist banana bread, baked daily.'),
  p('v13', 'Zobo, 1 litre', 1500, '#F1D3DA', 'Zobo bottle', 'Chilled zobo with ginger and pineapple.', { createdAt: '2026-10-21' }),
  p('v13', 'Kunun aya, 1 litre', 1800, '#F4ECC4', 'Kunun aya', 'Tiger nut drink with dates and coconut.'),
  p('v14', 'Bridal henna, both hands', 25000, '#EFE0EC', 'Bridal henna', 'Full bridal design, hands and wrists.'),
  p('v14', 'Party henna, one hand', 5000, '#F3D6CC', 'Party henna', 'Simple floral design for parties.'),
]

/**
 * Older ratings that came before the written reviews below, as counts of
 * 5, 4, 3, 2 and 1 stars. A real backend stores every rating.
 */
export const seedRatings: Record<string, [number, number, number, number, number]> = {
  v1: [102, 15, 4, 1, 1],
  v3: [140, 42, 12, 5, 4],
  v4: [48, 28, 8, 2, 2],
  v7: [5, 5, 3, 3, 3],
  v8: [16, 14, 6, 3, 2],
  v9: [30, 12, 4, 1, 1],
  v10: [10, 6, 5, 6, 10],
  v11: [50, 6, 1, 0, 1],
  v12: [36, 9, 2, 1, 0],
  v13: [22, 10, 3, 1, 1],
  v14: [28, 4, 1, 0, 0],
}

export const shoppers: Shopper[] = [
  { id: 's1', name: 'Aisha Bello', phone: '+2348130000954', area: 'Nassarawa GRA', joinedAt: '2026-07-11', lastActiveAt: '2026-10-26', status: 'active', initials: 'AB', tint: '#E3F1EA' },
  { id: 's2', name: 'Umar Sani', phone: '+2348020007719', area: 'Tarauni', joinedAt: '2026-09-04', lastActiveAt: '2026-10-25', status: 'active', initials: 'US', tint: '#E4E1F2' },
  { id: 's3', name: 'Kabiru Danladi', phone: '+2347010003308', area: 'Unknown', joinedAt: '2026-10-26', lastActiveAt: '2026-10-26', status: 'flagged', initials: 'KD', tint: '#FBE7D9' },
  { id: 's4', name: 'Blessing Okeke', phone: '+2348150002240', area: 'Sabon Gari', joinedAt: '2026-08-02', lastActiveAt: '2026-10-24', status: 'active', initials: 'BO', tint: '#F4ECC4' },
  { id: 's5', name: 'Zee L.', phone: '+2349060001102', area: 'Gyadi-Gyadi', joinedAt: '2026-10-25', lastActiveAt: '2026-10-25', status: 'flagged', initials: 'ZL', tint: '#EFE0EC' },
  { id: 's6', name: 'Musa Abdullahi', phone: '+2348050006610', area: 'Zoo Road', joinedAt: '2026-08-21', lastActiveAt: '2026-10-26', status: 'active', initials: 'MA', tint: '#D9EBE6' },
  { id: 's7', name: 'Anonymous123', phone: '+2349090000001', area: 'Unknown', joinedAt: '2026-10-02', lastActiveAt: '2026-10-12', status: 'suspended', suspensionReason: 'Abusive language', initials: 'A1', tint: '#ECE6D8' },
]

export const reviews: Review[] = [
  { id: 'r1', vendorId: 'v1', shopperId: 's1', stars: 5, tags: ['On time', 'Tasty'], text: 'Ordered 100 pieces for a naming ceremony. Arrived hot and on time.', createdAt: '2026-10-24', status: 'published' },
  { id: 'r2', vendorId: 'v1', shopperId: 's2', stars: 4, tags: ['Tasty'], text: 'Samosa was great, puff-puff a bit oily. Will still order again.', createdAt: '2026-10-19', status: 'published' },
  { id: 'r3', vendorId: 'v1', shopperId: 's4', stars: 5, tags: ['Good packaging', 'Quick replies'], text: 'Neat packaging and she replied fast on WhatsApp.', createdAt: '2026-10-05', status: 'published' },
  { id: 'r4', vendorId: 'v1', shopperId: 's3', stars: 1, tags: [], text: 'Worst food ever. Do not buy from her.', createdAt: '2026-10-26', status: 'flagged', flagReason: 'Reported by vendor: “We have no order from this number.” Reviewer posted 4 one-star reviews in 2 hours.' },
  { id: 'r5', vendorId: 'v11', shopperId: 's5', stars: 5, tags: [], text: 'Best beads in Kano!!! Buy now!!!', createdAt: '2026-10-25', status: 'flagged', flagReason: 'Auto-flagged: posted from the same device as the vendor’s account.' },
  { id: 'r6', vendorId: 'v3', shopperId: 's6', stars: 2, tags: [], text: 'Suya was cold and the delivery man was rude. Called twice and no answer.', createdAt: '2026-10-24', status: 'flagged', flagReason: 'Reported by vendor: “Not true, this customer refused to pay.”' },
  { id: 'r7', vendorId: 'v3', shopperId: 's1', stars: 5, tags: ['Tasty', 'Fair price'], text: 'The yaji is perfect. Best suya on Zoo Road.', createdAt: '2026-10-15', status: 'published' },
  { id: 'r8', vendorId: 'v10', shopperId: 's7', stars: 1, tags: [], text: '[Removed: abusive language]', createdAt: '2026-10-12', status: 'hidden', flagReason: 'Hidden by admin: abusive language.' },
  { id: 'r9', vendorId: 'v4', shopperId: 's2', stars: 4, tags: ['Fair price'], text: 'Chin chin is crunchy and fresh. Wish they delivered.', createdAt: '2026-10-21', status: 'published' },
  { id: 'r10', vendorId: 'v12', shopperId: 's4', stars: 5, tags: ['Tasty', 'Good packaging'], text: 'Cupcakes were beautiful and not too sweet.', createdAt: '2026-10-22', status: 'published' },
  { id: 'r11', vendorId: 'v7', shopperId: 's6', stars: 3, tags: [], text: 'Food was okay but delivery took almost two hours.', createdAt: '2026-10-18', status: 'published' },
  { id: 'r12', vendorId: 'v11', shopperId: 's1', stars: 5, tags: ['Friendly'], text: 'My waist beads came exactly as I asked. Lovely work.', createdAt: '2026-10-10', status: 'published' },
]

// Deterministic pseudo-random numbers so the demo charts look the same on
// the server and in the browser.
function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

function buildStats(vendorId: string, base: number, today: string): VendorStats {
  const rnd = seeded(vendorId.split('').reduce((a, c) => a + c.charCodeAt(0), 0) * 31)
  const daily: DailyStat[] = []
  const end = new Date(`${today}T12:00:00Z`)
  for (let i = 59; i >= 0; i--) {
    const d = new Date(end)
    d.setUTCDate(end.getUTCDate() - i)
    const weekend = d.getUTCDay() === 5 || d.getUTCDay() === 6
    const trend = 0.75 + (59 - i) / 59 * 0.35
    const views = Math.round(base * trend * (weekend ? 1.45 : 1) * (0.7 + rnd() * 0.6))
    const visitors = Math.round(views * (0.58 + rnd() * 0.1))
    daily.push({
      date: d.toISOString().slice(0, 10),
      views,
      visitors,
      whatsapp: Math.round(views * (0.07 + rnd() * 0.04)),
      calls: Math.round(views * (0.02 + rnd() * 0.02)),
      directions: Math.round(views * (0.015 + rnd() * 0.02)),
    })
  }
  return {
    vendorId,
    daily,
    sources: [
      { label: 'Search on Kusa', share: 0.46 },
      { label: 'Nearby map', share: 0.24 },
      { label: 'Shared links (WhatsApp, Instagram)', share: 0.21 },
      { label: 'Google and other sites', share: 0.09 },
    ],
    productViews: Object.fromEntries(
      products.filter((pr) => pr.vendorId === vendorId).map((pr, idx) => [pr.id, Math.round(base * 6 / (idx + 1) * (0.8 + rnd() * 0.4))]),
    ),
  }
}

export function buildAllStats(today: string): VendorStats[] {
  return vendors.map((v, i) => buildStats(v.id, v.id === 'v1' ? 58 : 18 + (i % 5) * 9, today))
}
