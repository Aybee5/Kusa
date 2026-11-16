// Shop videos: links to a vendor's own posts on TikTok, Instagram, YouTube or
// Facebook, played through each platform's embed player. Nothing is
// downloaded or hosted by Kusa. Used by the server (to store links) and the app
// (to check a link as it's typed and to build the player address).

export type VideoProvider = 'tiktok' | 'instagram' | 'youtube' | 'facebook'
/** Portrait = 9:16 (reels, TikToks, Shorts); landscape = 16:9. */
export type VideoAspect = 'portrait' | 'landscape'

export const MAX_SHOP_VIDEOS = 6

export const VIDEO_PROVIDERS: Record<VideoProvider, { label: string; noun: string; colour: string }> = {
  tiktok: { label: 'TikTok', noun: 'TikTok video', colour: '#111111' },
  instagram: { label: 'Instagram', noun: 'Instagram post', colour: '#C13584' },
  youtube: { label: 'YouTube', noun: 'YouTube video', colour: '#FF0000' },
  facebook: { label: 'Facebook', noun: 'Facebook video', colour: '#1877F2' },
}

export interface ParsedVideoLink {
  provider: VideoProvider
  /** The platform's id for the post (TikTok/YouTube/Facebook video id, Instagram shortcode). */
  externalId: string
  /** Clean link to the post, without tracking parameters. */
  url: string
  /** Known from the link alone (Shorts, reels, TikToks); otherwise null. */
  aspect: VideoAspect | null
}

/** Short share links that have to be followed (on the server) to find the post. */
const SHORT_HOSTS = ['vm.tiktok.com', 'vt.tiktok.com', 'fb.watch']

/** A share link like vm.tiktok.com/… or facebook.com/share/v/… that redirects to the post. */
export function isShortVideoLink(input: string): boolean {
  const u = toUrl(input)
  if (!u) return false
  const host = bareHost(u)
  if (SHORT_HOSTS.includes(host)) return true
  if (host === 'tiktok.com' && /^\/t\/[\w-]+\/?$/.test(u.pathname)) return true
  if (host === 'facebook.com' && /^\/share\/(v|r)\/[\w-]+\/?$/.test(u.pathname)) return true
  return false
}

/** Which platform a link is for, if any (works for short links too). */
export function videoProviderOf(input: string): VideoProvider | null {
  const u = toUrl(input)
  if (!u) return null
  const host = bareHost(u)
  if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) return 'tiktok'
  if (host === 'instagram.com') return 'instagram'
  if (host === 'youtube.com' || host === 'youtu.be' || host === 'youtube-nocookie.com') return 'youtube'
  if (host === 'facebook.com' || host === 'fb.watch') return 'facebook'
  return null
}

/** Read a full post link. Returns null for anything that isn't a single video or post. */
export function parseVideoLink(input: string): ParsedVideoLink | null {
  const u = toUrl(input)
  if (!u) return null
  const host = bareHost(u)
  const path = u.pathname.replace(/\/+$/, '')
  let m: RegExpExecArray | null

  if (host === 'tiktok.com') {
    // tiktok.com/@shop/video/7301234567890123456 (or /photo/ for slideshows)
    if ((m = /^\/@([\w.-]+)\/(?:video|photo)\/(\d{8,25})$/.exec(path))) {
      return { provider: 'tiktok', externalId: m[2]!, url: `https://www.tiktok.com/@${m[1]}/video/${m[2]}`, aspect: 'portrait' }
    }
    if ((m = /^\/(?:embed\/v2|embed|player\/v1)\/(\d{8,25})$/.exec(path))) {
      return { provider: 'tiktok', externalId: m[1]!, url: `https://www.tiktok.com/embed/v2/${m[1]}`, aspect: 'portrait' }
    }
    return null
  }

  if (host === 'instagram.com') {
    // instagram.com/p/CODE, /reel/CODE, /reels/CODE, /tv/CODE, and /username/p|reel/CODE
    if ((m = /^(?:\/[\w.]+)?\/(p|reels?|tv)\/([\w-]{5,40})(?:\/embed(?:\/captioned)?)?$/.exec(path))) {
      const kind = m[1] === 'p' ? 'p' : m[1] === 'tv' ? 'tv' : 'reel'
      return { provider: 'instagram', externalId: m[2]!, url: `https://www.instagram.com/${kind}/${m[2]}/`, aspect: kind === 'reel' ? 'portrait' : null }
    }
    return null
  }

  if (host === 'youtu.be') {
    if ((m = /^\/([\w-]{11})$/.exec(path))) return youtube(m[1]!, null)
    return null
  }
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if ((m = /^\/shorts\/([\w-]{11})$/.exec(path))) return youtube(m[1]!, 'portrait')
    if ((m = /^\/(?:embed|live|v)\/([\w-]{11})$/.exec(path))) return youtube(m[1]!, null)
    const v = u.searchParams.get('v')
    if (path === '/watch' && v && /^[\w-]{11}$/.test(v)) return youtube(v, null)
    return null
  }

  if (host === 'facebook.com') {
    // facebook.com/reel/ID, /watch/?v=ID, /PAGE/videos/ID, /PAGE/videos/title/ID, /video.php?v=ID
    if ((m = /^\/reel\/(\d{5,25})$/.exec(path))) return facebook(m[1]!, `https://www.facebook.com/reel/${m[1]}`, 'portrait')
    const v = u.searchParams.get('v')
    if ((path === '/watch' || path === '/video.php') && v && /^\d{5,25}$/.test(v)) return facebook(v, `https://www.facebook.com/watch/?v=${v}`, null)
    if ((m = /^\/([\w.-]+)\/videos\/(?:[\w.-]+\/)?(\d{5,25})$/.exec(path))) return facebook(m[2]!, `https://www.facebook.com/${m[1]}/videos/${m[2]}/`, null)
    return null
  }
  return null
}

/** The address of the platform's player for a stored video, loaded only once a shopper taps play. */
export function videoEmbedUrl(v: { provider: VideoProvider; externalId: string; url: string }): string {
  switch (v.provider) {
    case 'tiktok':
      return `https://www.tiktok.com/player/v1/${v.externalId}?autoplay=1&loop=1&description=1&music_info=0&rel=0&native_context_menu=0`
    case 'instagram':
      return `${v.url.replace(/\/$/, '')}/embed/captioned/`
    case 'youtube':
      return `https://www.youtube-nocookie.com/embed/${v.externalId}?autoplay=1&playsinline=1&rel=0&modestbranding=1`
    case 'facebook':
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(v.url)}&show_text=false&autoplay=true&allowfullscreen=true`
  }
}

/** Message for a link that can't be used, or null when it's fine (or a short link the server will follow). */
export function videoLinkProblem(input: string): string | null {
  const text = input.trim()
  if (!text) return 'Paste a link to the video'
  if (!toUrl(text)) return 'That doesn’t look like a link'
  if (isShortVideoLink(text) || parseVideoLink(text)) return null
  const provider = videoProviderOf(text)
  if (provider) return `Use the link to one ${VIDEO_PROVIDERS[provider].noun}, not a profile or page. Tap Share › Copy link on the post.`
  return 'Use a link from TikTok, Instagram, YouTube or Facebook'
}

function youtube(id: string, aspect: VideoAspect | null): ParsedVideoLink {
  return {
    provider: 'youtube',
    externalId: id,
    url: aspect === 'portrait' ? `https://www.youtube.com/shorts/${id}` : `https://www.youtube.com/watch?v=${id}`,
    aspect,
  }
}

function facebook(id: string, url: string, aspect: VideoAspect | null): ParsedVideoLink {
  return { provider: 'facebook', externalId: id, url, aspect }
}

function toUrl(input: string): URL | null {
  let text = input.trim()
  if (!text) return null
  if (!/^[a-z][a-z\d+.-]*:\/\//i.test(text)) text = `https://${text}`
  try {
    const u = new URL(text)
    return u.protocol === 'https:' || u.protocol === 'http:' ? u : null
  } catch {
    return null
  }
}

function bareHost(u: URL): string {
  return u.hostname.toLowerCase().replace(/^(www|m|mobile|web|business)\./, '')
}
