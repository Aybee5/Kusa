<script setup lang="ts">
import type { VendorVideo } from '#shared/types/api'
import { VIDEO_PROVIDERS } from '#shared/utils/videos'

// The card a shopper taps to play a video. Nothing from the platform loads
// until then (saves data): it shows the vendor's cover photo, YouTube's
// thumbnail, or the shop's own photo dimmed with the platform's colour.
const props = defineProps<{ video: Pick<VendorVideo, 'provider' | 'thumbnail' | 'title'>; fallback?: string | null; play?: boolean }>()
const asset = useAssetUrl()
const provider = computed(() => VIDEO_PROVIDERS[props.video.provider])
const image = computed(() => props.video.thumbnail ?? props.fallback ?? null)
</script>

<template>
  <div class="relative overflow-hidden bg-ink">
    <img v-if="image" :src="asset(image)" alt="" class="absolute inset-0 size-full object-cover" :class="video.thumbnail ? '' : 'opacity-55'" loading="lazy" />
    <div v-if="!video.thumbnail" class="absolute inset-0 opacity-60" :style="{ background: `linear-gradient(160deg, ${provider.colour}, transparent 75%)` }" />
    <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/25" />
    <span class="absolute left-1.5 top-1.5 max-w-[calc(100%-12px)] truncate rounded-full bg-black/55 px-2 py-0.5 text-[10.5px] font-bold text-white">{{ provider.label }}</span>
    <span v-if="play !== false" class="absolute left-1/2 top-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow">
      <AppIcon name="play" :size="20" class="translate-x-px" />
    </span>
    <span v-if="video.title" class="absolute inset-x-2 bottom-2 line-clamp-2 text-[12px] font-semibold leading-tight text-white">{{ video.title }}</span>
  </div>
</template>
