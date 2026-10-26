import { z } from 'zod'

const Body = z.object({ event: z.enum(['impression', 'click']) })

/** POST /api/promotions/:id/events: a sponsored slot was seen or tapped. Ignored unless the promotion is running. */
export default defineEventHandler(async (event) => {
  const { event: kind } = await readValidatedBody(event, Body.parse)
  await recordPromotionEvent(getRouterParam(event, 'id')!, kind)
  setResponseStatus(event, 204)
  return null
})
