<script setup lang="ts">
import type { VendorWithMeta } from '#shared/types'
import type { VendorVideo } from '#shared/types/api'
import { VIDEO_PROVIDERS } from '#shared/utils/videos'

// Full-screen player for a shop's videos. Swipe up and down between them;
// only the video on screen loads its platform player, the rest stay as
// cards, so scrolling past doesn't use data.
const props = defineProps<{ videos: VendorVideo[]; start: number; vendor: VendorWithMeta }>()
const emit = defineEmits<{ close: []; change: [index: number] }>()

const api = useApi()
const active = ref(props.start)
const failed = ref(new Set<string>())
const scroller = ref<HTMLElement | null>(null)
// Plain (non-reactive) element lists, filled by function refs in index order.
const slides: HTMLElement[] = []
const frames: Record<string, HTMLIFrameElement | null> = {}
const setSlide = (i: number, el: unknown) => { if (el) slides[i] = el as HTMLElement }
const setFrame = (id: string, el: unknown) => { frames[id] = (el as HTMLIFrameElement | null) ?? null }
const igHeight = ref<Record<string, number>>({})
const current = computed(() => props.videos[active.value])

let observer: IntersectionObserver | null = null
onMounted(() => {
  document.documentElement.style.overflow = 'hidden'
  slides[props.start]?.scrollIntoView({ block: 'start' })
  observer = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        const i = slides.indexOf(e.target as HTMLElement)
        if (i >= 0 && i !== active.value) {
          active.value = i
          emit('change', i)
        }
      }
    }
  }, { root: scroller.value, threshold: 0.6 })
  for (const s of slides) observer.observe(s)
  window.addEventListener('message', onMessage)
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  document.documentElement.style.overflow = ''
  observer?.disconnect()
  window.removeEventListener('message', onMessage)
  window.removeEventListener('keydown', onKey)
})

function go(i: number) {
  if (i < 0 || i >= props.videos.length) return
  slides[i]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
  if (e.key === 'ArrowDown') { e.preventDefault(); go(active.value + 1) }
  if (e.key === 'ArrowUp') { e.preventDefault(); go(active.value - 1) }
}

// Messages from the players: Instagram tells us how tall its post is;
// TikTok tells us when a video can't be played.
function onMessage(e: MessageEvent) {
  const v = current.value
  if (!v || e.source !== frames[v.id]?.contentWindow) return
  let data: unknown = e.data
  if (typeof data === 'string') {
    try { data = JSON.parse(data) } catch { return }
  }
  const d = data as { type?: string; details?: { height?: number }; value?: unknown; 'x-tiktok-player'?: boolean }
  if (v.provider === 'instagram' && d.type === 'MEASURE' && d.details?.height) {
    igHeight.value = { ...igHeight.value, [v.id]: Math.ceil(d.details.height) }
  }
  if (v.provider === 'tiktok' && d['x-tiktok-player'] && d.type === 'onPlayerError') {
    const code = typeof d.value === 'number' ? d.value : Number((d.value as { code?: number; errorCode?: number })?.code ?? (d.value as { errorCode?: number })?.errorCode)
    // 1001: no video with this id (deleted or private). Autoplay being blocked (3002) isn't a problem.
    if (code === 1001 || code === 2001) {
      failed.value = new Set(failed.value).add(v.id)
      if (code === 1001) api.reportVideoProblem(v.id, code)
    }
  }
}

const allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture; clipboard-write; web-share'
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[2000] flex flex-col bg-[#0B0F0D] text-white" role="dialog" aria-modal="true" :aria-label="`${vendor.name} videos`">
      <!-- Top bar -->
      <div class="pt-safe flex shrink-0 items-center gap-2 px-3 py-2">
        <button type="button" aria-label="Close videos" class="flex size-11 cursor-pointer items-center justify-center rounded-full bg-white/10 hover:bg-white/20" @click="emit('close')">
          <AppIcon name="x" :size="22" />
        </button>
        <div class="flex min-w-0 flex-1 flex-col leading-tight">
          <span class="truncate text-[15px] font-bold">{{ vendor.name }}</span>
          <span class="text-[12px] text-white/70">Video {{ active + 1 }} of {{ videos.length }}</span>
        </div>
        <a v-if="current" :href="current.url" target="_blank" rel="noopener" class="flex min-h-10 items-center gap-1.5 rounded-full bg-white/10 px-3 text-[13px] font-bold hover:bg-white/20">
          {{ VIDEO_PROVIDERS[current.provider].label }}<AppIcon name="external" :size="14" />
        </a>
      </div>

      <!-- Videos, one per screen -->
      <div class="relative min-h-0 flex-1">
        <div ref="scroller" class="no-scrollbar h-full snap-y snap-mandatory overflow-y-auto overscroll-contain">
          <section
            v-for="(v, i) in videos"
            :key="v.id"
            :ref="(el) => setSlide(i, el)"
            class="flex h-full snap-start snap-always items-center justify-center px-2 py-2 [container-type:size]"
            :aria-label="`Video ${i + 1}${v.title ? `: ${v.title}` : ''}`"
          >
            <!-- Not on screen: a card (nothing loads from the platform) -->
            <button
              v-if="i !== active"
              type="button"
              class="h-[min(100cqh,calc(100cqw*16/9))] w-[min(100cqw,calc(100cqh*9/16))] cursor-pointer overflow-hidden rounded-2xl"
              :aria-label="`Play video ${i + 1}`"
              @click="go(i)"
            >
              <VideoThumb :video="v" :fallback="vendor.coverImage ?? vendor.logo" class="size-full" />
            </button>

            <div v-else-if="failed.has(v.id)" class="flex max-w-[320px] flex-col items-center gap-3 text-center">
              <AppIcon name="video" :size="36" class="text-white/60" />
              <p class="text-[15px] font-semibold">This video can’t be played here right now.</p>
              <a :href="v.url" target="_blank" rel="noopener" class="btn-outline min-h-11 border-white bg-transparent text-white hover:bg-white/10">Open on {{ VIDEO_PROVIDERS[v.provider].label }}</a>
            </div>

            <!-- Instagram: its post layout, as tall as Instagram says, scrolls if needed -->
            <div v-else-if="v.provider === 'instagram'" class="no-scrollbar h-full w-[min(100cqw,420px)] overflow-y-auto rounded-2xl bg-white">
              <iframe
                :ref="(el) => setFrame(v.id, el)"
                :src="v.embedUrl"
                :title="v.title || `${vendor.name} on Instagram`"
                :style="{ height: `${igHeight[v.id] ?? 760}px` }"
                class="block w-full border-0"
                :allow="allow"
                allowfullscreen
                scrolling="no"
              />
            </div>

            <iframe
              v-else
              :ref="(el) => setFrame(v.id, el)"
              :src="v.embedUrl"
              :title="v.title || `${vendor.name} on ${VIDEO_PROVIDERS[v.provider].label}`"
              class="rounded-2xl border-0 bg-black"
              :class="v.aspect === 'portrait'
                ? 'h-[min(100cqh,calc(100cqw*16/9))] w-[min(100cqw,calc(100cqh*9/16))]'
                : 'h-[min(100cqh,calc(100cqw*9/16))] w-[min(100cqw,calc(100cqh*16/9))]'"
              :allow="allow"
              allowfullscreen
            />
          </section>
        </div>

        <!-- Up/down on larger screens -->
        <div v-if="videos.length > 1" class="absolute right-4 top-1/2 hidden -translate-y-1/2 flex-col gap-2 lg:flex">
          <button type="button" aria-label="Previous video" class="flex size-11 cursor-pointer items-center justify-center rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30" :disabled="active === 0" @click="go(active - 1)">
            <AppIcon name="arrow-up" />
          </button>
          <button type="button" aria-label="Next video" class="flex size-11 cursor-pointer items-center justify-center rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30" :disabled="active === videos.length - 1" @click="go(active + 1)">
            <AppIcon name="arrow-down" />
          </button>
        </div>
      </div>

      <!-- Reach the vendor without leaving the video -->
      <div class="pb-safe shrink-0 bg-paper text-ink">
        <div class="mx-auto flex max-w-[560px] flex-col gap-2 px-4 pb-3 pt-2.5">
          <p v-if="current?.title" class="truncate text-[13px] font-semibold text-ink-2">{{ current.title }}</p>
          <ContactButtons :vendor="vendor" variant="bar" />
        </div>
      </div>
    </div>
  </Teleport>
</template>
