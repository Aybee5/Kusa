import { and, asc, eq, inArray, isNull, lt, or, sql } from 'drizzle-orm'
import type { MyVendorVideo, VendorVideo } from '#shared/types/api'
import {
  isShortVideoLink, parseVideoLink, videoEmbedUrl, videoProviderOf, type ParsedVideoLink, type VideoAspect,
} from '#shared/utils/videos'
import type { VendorVideoRow } from '../database/schema'

/** How often a video is re-checked with its platform (when its shop is viewed). */
const RECHECK_AFTER_MS = 24 * 60 * 60 * 1000
const TIMEOUT_MS = 6000

export function toVendorVideo(r: VendorVideoRow): VendorVideo {
  return {
    id: r.id,
    provider: r.provider,
    url: r.url,
    embedUrl: videoEmbedUrl(r),
    title: r.title,
    thumbnail: publicFileUrl(r.coverImageKey)
      ?? (r.provider === 'youtube' ? `https://i.ytimg.com/vi/${r.externalId}/hqdefault.jpg` : null),
    aspect: r.aspect,
  }
}

export function toMyVendorVideo(r: VendorVideoRow): MyVendorVideo {
  return {
    ...toVendorVideo(r),
    status: r.status,
    coverImageKey: r.coverImageKey,
    problemReportedAt: r.problemReportedAt?.toISOString() ?? null,
    checkedAt: r.checkedAt?.toISOString() ?? null,
  }
}

/**
 * Turn what the vendor pasted into a post link, following share links
 * (vm.tiktok.com/…, fb.watch/…) to the post they point at.
 */
export async function resolveVideoLink(input: string): Promise<ParsedVideoLink> {
  const direct = parseVideoLink(input)
  if (direct) return direct
  if (!isShortVideoLink(input)) {
    const provider = videoProviderOf(input)
    throw createError({
      statusCode: 400,
      message: provider ? 'Use the link to one video or post, not a profile or page' : 'Use a link from TikTok, Instagram, YouTube or Facebook',
    })
  }
  let url = /^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`
  for (let hop = 0; hop < 4; hop++) {
    let res: Response
    try {
      res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT_MS), headers: { 'user-agent': 'Mozilla/5.0 (compatible; KusaBot/1.0)' } })
    } catch {
      throw createError({ statusCode: 502, message: 'We couldn’t open that share link. Paste the full link to the post instead.' })
    }
    const next = res.headers.get('location')
    if (!next || res.status < 300 || res.status >= 400) break
    url = new URL(next, url).toString()
    const parsed = parseVideoLink(url)
    if (parsed) return parsed
  }
  throw createError({ statusCode: 400, message: 'That share link doesn’t lead to a video. Open the post and copy its link.' })
}

export interface VideoCheck {
  /** gone = the platform says it doesn't exist, is private or can't be embedded. unknown = couldn't tell. */
  state: 'ok' | 'gone' | 'unknown'
  title?: string
  aspect?: VideoAspect
}

/**
 * Ask the platform whether a post can still be embedded. Only YouTube and
 * Instagram answer usefully: TikTok's and Facebook's oEmbed reply the same for
 * posts that don't exist, so those come back "unknown" and rely on shoppers'
 * players reporting a problem instead.
 */
export async function checkVideo(v: { provider: ParsedVideoLink['provider']; url: string }): Promise<VideoCheck> {
  const cfg = serverConfig()
  if (cfg.videoChecks === 'off') return { state: 'unknown' }
  try {
    if (v.provider === 'youtube') {
      const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(v.url)}`, { signal: AbortSignal.timeout(TIMEOUT_MS) })
      if (res.status === 400 || res.status === 401 || res.status === 403 || res.status === 404) return { state: 'gone' }
      if (!res.ok) return { state: 'unknown' }
      const d = await res.json() as { title?: string; width?: number; height?: number }
      const aspect = d.width && d.height ? (d.height > d.width ? 'portrait' : 'landscape') : undefined
      return { state: 'ok', title: d.title?.slice(0, 80), aspect }
    }
    if (v.provider === 'instagram') {
      const token = cfg.metaOembedToken ? `&access_token=${encodeURIComponent(cfg.metaOembedToken)}` : ''
      const res = await fetch(
        `https://graph.facebook.com/${cfg.metaGraphVersion}/instagram_oembed?omitscript=true&url=${encodeURIComponent(v.url)}${token}`,
        { signal: AbortSignal.timeout(TIMEOUT_MS) },
      )
      if (res.ok) return { state: 'ok' }
      const err = await res.json().catch(() => null) as { error?: { code?: number; error_subcode?: number } } | null
      // 24 / 2207045: "Media Not Found" (deleted, private, or the account doesn't allow embedding).
      if (err?.error?.code === 24 || err?.error?.error_subcode === 2207045) return { state: 'gone' }
      return { state: 'unknown' }
    }
  } catch {
    // Timeouts and network errors: try again next time.
  }
  return { state: 'unknown' }
}

/** Apply a check result to a stored video. */
export async function recordCheck(id: string, check: VideoCheck) {
  const changes: Partial<typeof schema.vendorVideos.$inferInsert> = { checkedAt: new Date() }
  if (check.state === 'gone') changes.status = 'unavailable'
  if (check.state === 'ok') Object.assign(changes, { status: 'active', problemReportedAt: null })
  const [row] = await useDb().update(schema.vendorVideos).set(changes).where(eq(schema.vendorVideos.id, id)).returning()
  return row
}

/**
 * Re-check a shop's videos that haven't been checked for a day. Each video is
 * claimed first (checked_at set) so concurrent page views don't repeat the
 * request. Runs after the response is sent.
 */
export async function recheckStaleVideos(vendorId: string) {
  if (serverConfig().videoChecks === 'off') return
  const { vendorVideos } = schema
  const stale = new Date(Date.now() - RECHECK_AFTER_MS)
  const claimed = await useDb().update(vendorVideos).set({ checkedAt: new Date() })
    .where(and(
      eq(vendorVideos.vendorId, vendorId),
      inArray(vendorVideos.provider, ['youtube', 'instagram']),
      or(isNull(vendorVideos.checkedAt), lt(vendorVideos.checkedAt, stale)),
    ))
    .returning()
  for (const v of claimed) {
    const check = await checkVideo(v)
    if (check.state !== 'unknown') await recordCheck(v.id, check)
  }
}

/** Active videos per vendor, for the "Video" badge in search results. */
export async function videoCounts(vendorIds: string[]): Promise<Map<string, number>> {
  if (!vendorIds.length) return new Map()
  const { vendorVideos } = schema
  const rows = await useDb()
    .select({ vendorId: vendorVideos.vendorId, n: sql<number>`count(*)::int` })
    .from(vendorVideos)
    .where(and(inArray(vendorVideos.vendorId, vendorIds), eq(vendorVideos.status, 'active')))
    .groupBy(vendorVideos.vendorId)
  return new Map(rows.map((r) => [r.vendorId, r.n]))
}

export function listVendorVideos(vendorId: string, onlyActive: boolean) {
  const { vendorVideos } = schema
  return useDb().select().from(vendorVideos)
    .where(and(eq(vendorVideos.vendorId, vendorId), ...(onlyActive ? [eq(vendorVideos.status, 'active')] : [])))
    .orderBy(asc(vendorVideos.position), asc(vendorVideos.createdAt))
}

/** One of the signed-in vendor's videos, or 404. */
export async function ownVideo(vendorId: string, id: string): Promise<VendorVideoRow> {
  const { vendorVideos } = schema
  const [row] = await useDb().select().from(vendorVideos)
    .where(and(eq(vendorVideos.id, id), eq(vendorVideos.vendorId, vendorId))).limit(1)
  if (!row) throw createError({ statusCode: 404, message: 'Video not found' })
  return row
}
