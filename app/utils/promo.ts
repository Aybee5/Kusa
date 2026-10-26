/** Mark in-app links from sponsored slots so the vendor's stats show visits from their promotions. */
export function withAdSource(path: string): string {
  if (!path.startsWith('/v/') && !path.startsWith('/p/')) return path
  return `${path}${path.includes('?') ? '&' : '?'}from=ad`
}

/** "26 Oct" in Lagos time from an ISO timestamp. */
export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Africa/Lagos' })
}
