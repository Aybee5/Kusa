<script setup lang="ts">
// Wraps a sponsored card: counts an impression once it's at least half on
// screen, and a click when it's tapped.
const props = defineProps<{ promotionId: string }>()
const api = useApi()
const el = useTemplateRef<HTMLElement>('el')
let seen = false
let observer: IntersectionObserver | undefined

onMounted(() => {
  if (!el.value || typeof IntersectionObserver === 'undefined') return
  observer = new IntersectionObserver((entries) => {
    if (seen || !entries.some((e) => e.isIntersecting)) return
    seen = true
    observer?.disconnect()
    api.recordPromotionEvent(props.promotionId, 'impression')
  }, { threshold: 0.5 })
  observer.observe(el.value)
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div ref="el" @click.capture="api.recordPromotionEvent(promotionId, 'click')">
    <slot />
  </div>
</template>
