<script setup lang="ts">
import type { VendorWithMeta } from '#shared/types'

// The row of video cards on a shop page. Tapping one opens the full-screen
// player; the open video is kept in the address (?video=…) so the phone's
// back button closes it and the link can be shared.
const props = defineProps<{ vendor: VendorWithMeta }>()
const api = useApi()
const route = useRoute()
const router = useRouter()
const { data: videos } = await useAsyncData(`vendor-videos-${props.vendor.id}`, () => api.listVideos(props.vendor.id), { default: () => [] })

const openIndex = computed(() => {
  const id = route.query.video
  const i = videos.value.findIndex((v) => v.id === id)
  return i >= 0 ? i : null
})
let pushed = false
function open(i: number) {
  pushed = true
  router.push({ query: { ...route.query, video: videos.value[i]!.id } })
}
function change(i: number) {
  router.replace({ query: { ...route.query, video: videos.value[i]!.id } })
}
function close() {
  if (pushed) {
    pushed = false
    router.back()
  } else {
    const { video: _, ...rest } = route.query
    router.replace({ query: rest })
  }
}
</script>

<template>
  <section v-if="videos.length" class="flex flex-col gap-2.5" aria-labelledby="shop-videos-h">
    <h2 id="shop-videos-h" class="flex items-center gap-1.5 text-[15px] font-bold"><AppIcon name="video" :size="18" />Videos</h2>
    <div class="no-scrollbar -mx-5 flex gap-2.5 overflow-x-auto px-5 lg:mx-0 lg:px-0">
      <button
        v-for="(v, i) in videos"
        :key="v.id"
        type="button"
        class="shrink-0 cursor-pointer overflow-hidden rounded-2xl"
        :aria-label="`Play video ${i + 1}${v.title ? `: ${v.title}` : ''}`"
        @click="open(i)"
      >
        <VideoThumb :video="v" :fallback="vendor.coverImage ?? vendor.logo" class="h-[196px] w-[110px] lg:h-[240px] lg:w-[135px]" />
      </button>
    </div>
    <ClientOnly>
      <VideoViewer v-if="openIndex !== null" :videos="videos" :start="openIndex" :vendor="vendor" @close="close" @change="change" />
    </ClientOnly>
  </section>
</template>
