/**
 * Nigeria's 36 states and the FCT, with each capital's location. Used to let
 * shoppers browse a state and to guess a business's state from its map pin
 * (the vendor can change the guess).
 */
export const NG_STATES = [
  { name: 'Abia', capital: 'Umuahia', lat: 5.5333, lng: 7.4833 },
  { name: 'Adamawa', capital: 'Yola', lat: 9.2035, lng: 12.4954 },
  { name: 'Akwa Ibom', capital: 'Uyo', lat: 5.0377, lng: 7.9128 },
  { name: 'Anambra', capital: 'Awka', lat: 6.2104, lng: 7.0741 },
  { name: 'Bauchi', capital: 'Bauchi', lat: 10.3158, lng: 9.8442 },
  { name: 'Bayelsa', capital: 'Yenagoa', lat: 4.9267, lng: 6.2676 },
  { name: 'Benue', capital: 'Makurdi', lat: 7.7322, lng: 8.5391 },
  { name: 'Borno', capital: 'Maiduguri', lat: 11.8311, lng: 13.151 },
  { name: 'Cross River', capital: 'Calabar', lat: 4.9757, lng: 8.3417 },
  { name: 'Delta', capital: 'Asaba', lat: 6.198, lng: 6.7319 },
  { name: 'Ebonyi', capital: 'Abakaliki', lat: 6.3249, lng: 8.1137 },
  { name: 'Edo', capital: 'Benin City', lat: 6.335, lng: 5.6037 },
  { name: 'Ekiti', capital: 'Ado-Ekiti', lat: 7.6211, lng: 5.2214 },
  { name: 'Enugu', capital: 'Enugu', lat: 6.4584, lng: 7.5464 },
  { name: 'FCT', capital: 'Abuja', lat: 9.0765, lng: 7.3986 },
  { name: 'Gombe', capital: 'Gombe', lat: 10.2897, lng: 11.1673 },
  { name: 'Imo', capital: 'Owerri', lat: 5.484, lng: 7.0351 },
  { name: 'Jigawa', capital: 'Dutse', lat: 11.7562, lng: 9.3388 },
  { name: 'Kaduna', capital: 'Kaduna', lat: 10.5105, lng: 7.4165 },
  { name: 'Kano', capital: 'Kano', lat: 12.0022, lng: 8.592 },
  { name: 'Katsina', capital: 'Katsina', lat: 12.9908, lng: 7.6018 },
  { name: 'Kebbi', capital: 'Birnin Kebbi', lat: 12.4539, lng: 4.1975 },
  { name: 'Kogi', capital: 'Lokoja', lat: 7.8023, lng: 6.7333 },
  { name: 'Kwara', capital: 'Ilorin', lat: 8.4966, lng: 4.5421 },
  { name: 'Lagos', capital: 'Ikeja', lat: 6.5244, lng: 3.3792 },
  { name: 'Nasarawa', capital: 'Lafia', lat: 8.4939, lng: 8.5153 },
  { name: 'Niger', capital: 'Minna', lat: 9.6139, lng: 6.5569 },
  { name: 'Ogun', capital: 'Abeokuta', lat: 7.1475, lng: 3.3619 },
  { name: 'Ondo', capital: 'Akure', lat: 7.2571, lng: 5.2058 },
  { name: 'Osun', capital: 'Osogbo', lat: 7.7827, lng: 4.5418 },
  { name: 'Oyo', capital: 'Ibadan', lat: 7.3775, lng: 3.947 },
  { name: 'Plateau', capital: 'Jos', lat: 9.8965, lng: 8.8583 },
  { name: 'Rivers', capital: 'Port Harcourt', lat: 4.8156, lng: 7.0498 },
  { name: 'Sokoto', capital: 'Sokoto', lat: 13.0059, lng: 5.2476 },
  { name: 'Taraba', capital: 'Jalingo', lat: 8.8937, lng: 11.3596 },
  { name: 'Yobe', capital: 'Damaturu', lat: 11.747, lng: 11.9608 },
  { name: 'Zamfara', capital: 'Gusau', lat: 12.1704, lng: 6.6641 },
] as const

export type NgState = (typeof NG_STATES)[number]['name']
export const STATE_NAMES = NG_STATES.map((s) => s.name) as unknown as [NgState, ...NgState[]]

/** "FCT" reads better as "Abuja (FCT)" in lists and headings. */
export const stateLabel = (name: string) => (name === 'FCT' ? 'Abuja (FCT)' : name)

/** The state whose capital is nearest a point: a starting guess the vendor confirms. */
export function guessState(p: { lat: number; lng: number }): NgState {
  let best: (typeof NG_STATES)[number] = NG_STATES[0]
  let bestD = Infinity
  for (const s of NG_STATES) {
    const k = Math.cos((p.lat * Math.PI) / 180)
    const d = (s.lat - p.lat) ** 2 + ((s.lng - p.lng) * k) ** 2
    if (d < bestD) [best, bestD] = [s, d]
  }
  return best.name
}

/** Match a typed state name, e.g. "lagos", "Abuja", "fct" or "akwa-ibom". */
export function findState(input: string): NgState | null {
  const t = input.trim().toLowerCase().replace(/[-_]+/g, ' ')
  if (!t) return null
  if (t === 'abuja' || t === 'fct' || t === 'abuja (fct)') return 'FCT'
  return NG_STATES.find((s) => s.name.toLowerCase() === t)?.name ?? null
}
