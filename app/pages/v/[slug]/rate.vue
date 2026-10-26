<script setup lang="ts">
definePageMeta({ layout: 'bare' })

const route = useRoute()
const api = useApi()
const { origin } = useLocation()
const { user, ready } = useSession()
const slug = String(route.params.slug)

const { data: vendor } = await useAsyncData(`vendor-${slug}`, () => api.getVendor(slug, origin.value))
if (!vendor.value) throw createError({ statusCode: 404, statusMessage: 'Business not found', fatal: true })

const stars = ref(0)
const tags = ref<string[]>([])
const text = ref('')
const sent = ref(false)
const saving = ref(false)
const editing = ref(false)
const words = ['Tap a star to rate', 'Poor', 'Not great', 'Okay', 'Good', 'Excellent']
const tagOptions = computed(() => reviewTagsFor(vendor.value!.category))

// Ratings need an account, so each shopper rates a business once.
watch([ready, user], async () => {
  if (!ready.value) return
  if (!user.value) return navigateTo({ path: '/signin', query: { redirect: route.fullPath } }, { replace: true })
  const mine = await api.myReview(vendor.value!.id)
  if (mine) {
    stars.value = mine.stars
    tags.value = [...mine.tags]
    text.value = mine.text
    editing.value = true
  }
}, { immediate: true })

function toggleTag(t: string) {
  tags.value = tags.value.includes(t) ? tags.value.filter((x) => x !== t) : [...tags.value, t]
}

async function submit() {
  if (!user.value || !stars.value) return
  saving.value = true
  try {
    await api.saveReview({ vendorId: vendor.value!.id, stars: stars.value, tags: tags.value, text: text.value.trim() })
  } catch (e) {
    saving.value = false
    useToast().show((e as Error).message)
    return
  }
  await refreshNuxtData([`vendor-${slug}`, `vendor-reviews-${slug}`])
  saving.value = false
  sent.value = true
}

useSeoMeta({ title: () => `Rate ${vendor.value?.name} · Kusa`, robots: 'noindex' })
</script>

<template>
  <div v-if="vendor" class="relative flex min-h-dvh flex-col lg:min-h-0">
    <template v-if="!sent">
      <div class="flex flex-1 flex-col gap-5 px-5 pb-28 pt-2.5">
        <div class="flex items-center justify-between">
          <NuxtLink :to="`/v/${vendor.slug}?tab=reviews`" aria-label="Close" class="-ml-2.5 flex size-11 items-center justify-center text-ink"><AppIcon name="x" :size="24" /></NuxtLink>
          <span v-if="user" class="text-[13px] font-semibold text-muted">Posting as {{ user.name.split(' ')[0] }}</span>
        </div>

        <div class="flex items-center gap-3">
          <span class="flex size-[52px] shrink-0 items-center justify-center rounded-2xl font-display text-lg font-extrabold" :style="{ backgroundColor: vendor.tint }">{{ vendor.initials }}</span>
          <div class="flex flex-col gap-0.5">
            <h1 class="font-display text-2xl font-extrabold leading-tight tracking-tight">{{ editing ? 'Edit your rating for' : 'Rate' }} {{ vendor.name }}</h1>
            <span class="text-[13px] text-muted">{{ categoryLabel(vendor.category) }} · {{ vendor.area }}, {{ vendor.city }}</span>
          </div>
        </div>

        <fieldset class="flex flex-col items-center gap-2.5 rounded-[18px] bg-surface px-4 py-[18px]">
          <legend class="sr-only">How was your experience?</legend>
          <p class="text-base font-bold" aria-hidden="true">How was your experience?</p>
          <div class="flex gap-1.5">
            <button
              v-for="n in 5"
              :key="n"
              type="button"
              :aria-label="`${n} ${n === 1 ? 'star' : 'stars'}`"
              :aria-pressed="stars >= n"
              class="flex size-[52px] cursor-pointer items-center justify-center"
              @click="stars = n"
            >
              <svg width="42" height="42" viewBox="0 0 24 24" aria-hidden="true">
                <path :fill="stars >= n ? '#E0A21B' : '#FFFFFF'" :stroke="stars >= n ? '#E0A21B' : '#C9C2B3'" stroke-width="1.4" stroke-linejoin="round" d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z" />
              </svg>
            </button>
          </div>
          <span class="text-sm font-bold" :class="stars ? 'text-ink' : 'text-muted'" aria-live="polite">{{ words[stars] }}</span>
        </fieldset>

        <fieldset class="flex flex-col gap-2.5">
          <legend class="pb-2.5 text-[15px] font-bold">What stood out? <span class="font-medium text-muted">· optional</span></legend>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="t in tagOptions"
              :key="t"
              type="button"
              :aria-pressed="tags.includes(t)"
              class="h-10 cursor-pointer rounded-full border-[1.5px] px-3.5 text-sm font-semibold"
              :class="tags.includes(t) ? 'border-palm bg-palm-tint text-palm' : 'border-line bg-surface text-ink'"
              @click="toggleTag(t)"
            >
              {{ t }}
            </button>
          </div>
        </fieldset>

        <div class="flex flex-col gap-1.5">
          <label for="review" class="text-[15px] font-bold">Tell others more <span class="font-medium text-muted">· optional</span></label>
          <textarea id="review" v-model="text" rows="3" maxlength="600" placeholder="What did you buy? How was the quality, delivery or packaging?" class="field h-auto resize-none py-3" />
        </div>

        <p class="flex gap-2 text-[13px] leading-snug text-muted"><AppIcon name="shield" :size="18" />Only signed-in shoppers can rate, once per business. You can edit your rating later.</p>
      </div>

      <div class="pb-safe sticky bottom-0 bg-paper px-5 pt-3 lg:pb-5">
        <div class="pb-3 lg:pb-0">
          <button type="button" class="btn-primary h-[54px] w-full text-base" :disabled="!stars || saving" @click="submit">
            {{ saving ? 'Posting…' : editing ? 'Update rating' : 'Post rating' }}
          </button>
        </div>
      </div>
    </template>

    <div v-else class="flex min-h-dvh flex-col items-center justify-center gap-4 px-7 text-center lg:min-h-[560px]">
      <span class="flex size-[84px] items-center justify-center rounded-full bg-palm text-white"><AppIcon name="check" :size="42" :stroke="2.4" /></span>
      <h1 class="font-display text-3xl font-extrabold tracking-tight">Thanks{{ user ? `, ${user.name.split(' ')[0]}` : '' }}!</h1>
      <p class="text-[15px] leading-relaxed text-ink-2">Your {{ stars }}-star rating helps neighbours find good businesses near them.</p>
      <NuxtLink :to="`/v/${vendor.slug}?tab=reviews`" class="btn-dark mt-2 h-[52px] px-6">Back to {{ vendor.name }}</NuxtLink>
      <button type="button" class="min-h-11 cursor-pointer text-sm font-bold text-palm" @click="sent = false; editing = true">Edit my rating</button>
    </div>
  </div>
</template>
