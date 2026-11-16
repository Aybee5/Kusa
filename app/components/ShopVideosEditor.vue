<script setup lang="ts">
import type { MyVendorVideo } from '#shared/types/api'
import { MAX_SHOP_VIDEOS, VIDEO_PROVIDERS, videoLinkProblem, videoProviderOf } from '#shared/utils/videos'

// Shop videos in the shop editor. Each change is saved straight away (it
// doesn't wait for the page's Save button).
const props = defineProps<{ fallback?: string | null }>()
const api = useApi()
const toast = useToast()
const { data: videos } = await useAsyncData('my-videos', () => api.myVideos(), { server: false, default: () => [] as MyVendorVideo[] })

const link = ref('')
const adding = ref(false)
const touched = ref(false)
const linkProblem = computed(() => (link.value.trim() ? videoLinkProblem(link.value) : null))
const detected = computed(() => {
  const p = link.value.trim() && !linkProblem.value ? videoProviderOf(link.value) : null
  return p ? VIDEO_PROVIDERS[p].label : null
})
const full = computed(() => (videos.value?.length ?? 0) >= MAX_SHOP_VIDEOS)

async function add() {
  touched.value = true
  if (adding.value || full.value || !link.value.trim() || linkProblem.value) return
  adding.value = true
  try {
    const v = await api.addVideo({ url: link.value.trim() })
    videos.value = [...(videos.value ?? []), v]
    link.value = ''
    touched.value = false
    toast.show('Video added to your page')
  } catch (e) {
    toast.show((e as Error).message)
  } finally {
    adding.value = false
  }
}

function replace(v: MyVendorVideo) {
  videos.value = (videos.value ?? []).map((x) => (x.id === v.id ? v : x))
}

async function saveTitle(v: MyVendorVideo, title: string) {
  if (title.trim() === v.title) return
  try {
    replace(await api.updateVideo(v.id, { title: title.trim() }))
  } catch (e) {
    toast.show((e as Error).message)
  }
}

const uploading = ref<string | null>(null)
async function chooseCover(v: MyVendorVideo) {
  const photo = await pickPhoto('library')
  if (!photo) return
  uploading.value = v.id
  try {
    const { key } = await api.uploadPhoto(photo, 'shop')
    replace(await api.updateVideo(v.id, { coverImageKey: key }))
  } catch (e) {
    toast.show((e as Error).message)
  } finally {
    uploading.value = null
  }
}
async function removeCover(v: MyVendorVideo) {
  try {
    replace(await api.updateVideo(v.id, { coverImageKey: null }))
  } catch (e) {
    toast.show((e as Error).message)
  }
}

async function move(index: number, by: -1 | 1) {
  const list = [...(videos.value ?? [])]
  const [item] = list.splice(index, 1)
  list.splice(index + by, 0, item!)
  const before = videos.value
  videos.value = list
  try {
    videos.value = await api.reorderVideos(list.map((x) => x.id))
  } catch (e) {
    videos.value = before
    toast.show((e as Error).message)
  }
}

const confirming = ref<string | null>(null)
async function remove(v: MyVendorVideo) {
  if (confirming.value !== v.id) {
    confirming.value = v.id
    return
  }
  confirming.value = null
  try {
    await api.deleteVideo(v.id)
    videos.value = (videos.value ?? []).filter((x) => x.id !== v.id)
    toast.show('Video removed')
  } catch (e) {
    toast.show((e as Error).message)
  }
}

const checking = ref<string | null>(null)
async function recheck(v: MyVendorVideo) {
  checking.value = v.id
  try {
    const after = await api.recheckVideo(v.id)
    replace(after)
    toast.show(after.status === 'active' ? 'Video is showing on your page' : 'Still not available. Check the post is public.')
  } catch (e) {
    toast.show((e as Error).message)
  } finally {
    checking.value = null
  }
}
</script>

<template>
  <section class="flex flex-col gap-3" aria-labelledby="videos-h">
    <div class="flex items-baseline justify-between gap-3">
      <h2 id="videos-h" class="text-[17px] font-bold">Videos</h2>
      <span class="text-[13px] text-muted">{{ videos?.length ?? 0 }} of {{ MAX_SHOP_VIDEOS }}</span>
    </div>
    <p class="-mt-1.5 text-[13px] leading-snug text-muted">
      Show your TikTok, Instagram, YouTube or Facebook videos on your page. Paste the link to the post: it plays from there, so there’s nothing to upload. The post must be public.
    </p>

    <div v-if="!full" class="flex flex-col gap-1.5">
      <label for="v-link" class="label">Link to a video or post</label>
      <div class="flex gap-2">
        <input
          id="v-link"
          v-model="link"
          type="url"
          inputmode="url"
          autocomplete="off"
          placeholder="https://www.tiktok.com/@yourshop/video/…"
          class="field min-w-0 flex-1"
          :aria-invalid="touched && !!linkProblem"
          aria-describedby="v-link-hint"
          @keydown.enter.prevent="add"
          @blur="touched = true"
        />
        <button type="button" class="btn-dark h-12 shrink-0 px-4" :disabled="adding || !link.trim()" @click="add">
          <AppIcon name="plus" :size="18" />{{ adding ? 'Adding…' : 'Add' }}
        </button>
      </div>
      <p id="v-link-hint" class="text-[13px]" :class="touched && linkProblem ? 'font-semibold text-danger-ink' : 'text-muted'">
        <template v-if="touched && linkProblem">{{ linkProblem }}</template>
        <template v-else-if="detected">{{ detected }} link ✓</template>
        <template v-else>On the post, tap Share › Copy link, then paste it here.</template>
      </p>
    </div>
    <p v-else class="rounded-2xl bg-sand px-3.5 py-3 text-[13px] text-ink-2">You’ve added {{ MAX_SHOP_VIDEOS }} videos, the most a page can show. Remove one to add another.</p>

    <ul v-if="videos?.length" class="flex flex-col gap-2.5">
      <li v-for="(v, i) in videos" :key="v.id" class="card flex gap-3 p-2.5" :class="v.status === 'unavailable' ? 'border-danger-line' : ''">
        <VideoThumb :video="v" :fallback="props.fallback" :play="false" class="h-[118px] w-[68px] shrink-0 rounded-xl" />
        <div class="flex min-w-0 flex-1 flex-col gap-1.5">
          <div class="flex items-center gap-2 text-[13px]">
            <span class="font-bold">{{ VIDEO_PROVIDERS[v.provider].label }}</span>
            <a :href="v.url" target="_blank" rel="noopener" class="flex min-w-0 items-center gap-1 text-muted underline">
              <span class="truncate">Open post</span><AppIcon name="external" :size="13" />
            </a>
          </div>
          <label :for="`v-title-${v.id}`" class="sr-only">Title</label>
          <input
            :id="`v-title-${v.id}`"
            :value="v.title"
            type="text"
            maxlength="80"
            placeholder="Title (optional)"
            class="field h-10 rounded-xl text-[14px]"
            @change="saveTitle(v, ($event.target as HTMLInputElement).value)"
            @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
          />
          <p v-if="v.status === 'unavailable'" class="rounded-xl bg-danger-tint px-2.5 py-1.5 text-[12px] font-semibold leading-snug text-danger-ink">
            {{ VIDEO_PROVIDERS[v.provider].label }} says this post is gone or private, so it’s hidden from shoppers. Make it public again, then check.
          </p>
          <p v-else-if="v.problemReportedAt" class="rounded-xl bg-amber-tint px-2.5 py-1.5 text-[12px] font-semibold leading-snug text-amber-ink">
            A shopper couldn’t play this on {{ formatDate(v.problemReportedAt) }}. Make sure the post is still up and public.
          </p>
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-bold">
            <button v-if="v.status === 'unavailable' || v.problemReportedAt" type="button" class="flex min-h-8 cursor-pointer items-center gap-1 text-palm" :disabled="checking === v.id" @click="recheck(v)">
              <AppIcon name="refresh" :size="15" />{{ checking === v.id ? 'Checking…' : v.status === 'unavailable' ? 'Check again' : 'It’s fine now' }}
            </button>
            <button type="button" class="flex min-h-8 cursor-pointer items-center gap-1" :disabled="uploading === v.id" @click="chooseCover(v)">
              <AppIcon name="camera" :size="15" />{{ uploading === v.id ? 'Uploading…' : v.coverImageKey ? 'Change cover' : 'Add cover' }}
            </button>
            <button v-if="v.coverImageKey" type="button" class="min-h-8 cursor-pointer text-muted" @click="removeCover(v)">Remove cover</button>
            <button type="button" class="flex min-h-8 cursor-pointer items-center gap-1 text-danger-ink" @click="remove(v)" @blur="confirming = null">
              <AppIcon name="trash" :size="15" />{{ confirming === v.id ? 'Tap again to remove' : 'Remove' }}
            </button>
          </div>
        </div>
        <div v-if="videos.length > 1" class="flex flex-col justify-center gap-1">
          <button type="button" class="flex size-9 cursor-pointer items-center justify-center rounded-full border border-line disabled:opacity-30" :disabled="i === 0" :aria-label="`Move video ${i + 1} up`" @click="move(i, -1)">
            <AppIcon name="arrow-up" :size="16" />
          </button>
          <button type="button" class="flex size-9 cursor-pointer items-center justify-center rounded-full border border-line disabled:opacity-30" :disabled="i === videos.length - 1" :aria-label="`Move video ${i + 1} down`" @click="move(i, 1)">
            <AppIcon name="arrow-down" :size="16" />
          </button>
        </div>
      </li>
    </ul>
    <p v-if="videos?.length" class="text-[12px] text-muted">A cover photo is optional. Without one, the card shows {{ props.fallback ? 'your shop photo' : 'your shop’s colours' }} (YouTube shows its own thumbnail).</p>
  </section>
</template>
