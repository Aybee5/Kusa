import { eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { MAX_SHOP_VIDEOS } from '#shared/utils/videos'

const Body = z.object({
  url: z.string().trim().min(1, 'Paste a link to the video').max(500),
  title: z.string().trim().max(80).optional(),
  coverImageKey: z.string().max(200).optional(),
})

/**
 * POST /api/me/videos: add a TikTok, Instagram, YouTube or Facebook post to
 * the shop. Only the link is kept; shoppers play it in the platform's player.
 */
export default defineEventHandler(async (event) => {
  const { user, vendor } = await requireVendor(event)
  const body = await readValidatedBody(event, Body.parse)
  assertOwnKey(body.coverImageKey, 'shop', user.id)
  const { vendorVideos } = schema
  const db = useDb()

  const [{ n, last }] = await db.select({ n: sql<number>`count(*)::int`, last: sql<number>`coalesce(max(${vendorVideos.position}), -1)::int` })
    .from(vendorVideos).where(eq(vendorVideos.vendorId, vendor.id)) as [{ n: number; last: number }]
  if (n >= MAX_SHOP_VIDEOS) throw createError({ statusCode: 400, message: `You can add up to ${MAX_SHOP_VIDEOS} videos. Remove one to add another.` })

  const link = await resolveVideoLink(body.url)
  const check = await checkVideo(link)
  if (check.state === 'gone') {
    throw createError({ statusCode: 400, message: 'We couldn’t find that video. Check the post is public and the link is right.' })
  }
  const [row] = await db.insert(vendorVideos).values({
    vendorId: vendor.id,
    provider: link.provider,
    externalId: link.externalId,
    url: link.url,
    title: body.title || check.title || '',
    coverImageKey: body.coverImageKey ?? null,
    aspect: link.aspect ?? check.aspect ?? (link.provider === 'youtube' || link.provider === 'facebook' ? 'landscape' : 'portrait'),
    position: last + 1,
    checkedAt: check.state === 'ok' ? new Date() : null,
  }).onConflictDoNothing().returning()
  if (!row) throw createError({ statusCode: 409, message: 'That video is already in your shop' })
  return toMyVendorVideo(row)
})
