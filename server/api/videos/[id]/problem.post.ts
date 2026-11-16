import { and, eq, isNull, lt, or } from 'drizzle-orm'
import { z } from 'zod'

const Body = z.object({ code: z.number().int().optional() })
const RECHECK_AFTER_MS = 60 * 60 * 1000

/**
 * POST /api/videos/:id/problem: a shopper's player couldn't play the video
 * (e.g. TikTok's "video not found"). YouTube and Instagram videos are checked
 * with the platform (at most hourly). TikTok and Facebook can't be checked, so
 * the vendor is told in the shop editor instead; one report doesn't hide a
 * video from everyone.
 */
export default defineEventHandler(async (event) => {
  await readValidatedBody(event, Body.parse)
  const { vendorVideos } = schema
  const id = getRouterParam(event, 'id')!
  const [video] = await useDb().select().from(vendorVideos).where(eq(vendorVideos.id, id)).limit(1)
  if (!video) throw createError({ statusCode: 404, message: 'Video not found' })
  if (video.provider === 'youtube' || video.provider === 'instagram') {
    const [claimed] = await useDb().update(vendorVideos).set({ checkedAt: new Date() })
      .where(and(eq(vendorVideos.id, id), or(isNull(vendorVideos.checkedAt), lt(vendorVideos.checkedAt, new Date(Date.now() - RECHECK_AFTER_MS)))))
      .returning()
    if (claimed) {
      const check = await checkVideo(video)
      if (check.state !== 'unknown') await recordCheck(id, check)
    }
  } else {
    await useDb().update(vendorVideos).set({ problemReportedAt: new Date() }).where(eq(vendorVideos.id, id))
  }
  setResponseStatus(event, 204)
  return null
})
