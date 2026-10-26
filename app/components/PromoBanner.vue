<script setup lang="ts">
import type { PromotedBanner } from '~/services/api'
// A sponsored banner: the vendor's image with the headline over it, or a
// text banner in the vendor's colours when there's no image.
const props = defineProps<{ banner: Pick<PromotedBanner, 'headline' | 'imageUrl' | 'sponsor' | 'tint' | 'link' | 'external'>; preview?: boolean }>()
const asset = useAssetUrl()
const to = computed(() => (props.banner.external ? undefined : withAdSource(props.banner.link)))
const NuxtLink = resolveComponent('NuxtLink')
</script>

<template>
  <component
    :is="preview ? 'div' : banner.external ? 'a' : NuxtLink"
    :to="preview ? undefined : to"
    :href="!preview && banner.external ? banner.link : undefined"
    :target="!preview && banner.external ? '_blank' : undefined"
    :rel="!preview && banner.external ? 'noopener sponsored' : undefined"
    class="relative flex aspect-[2.4/1] w-full overflow-hidden rounded-[20px] text-ink lg:aspect-[3/1]"
    :style="{ backgroundColor: banner.imageUrl ? '#16211B' : banner.tint }"
  >
    <template v-if="banner.imageUrl">
      <img :src="asset(banner.imageUrl)" alt="" class="absolute inset-0 size-full object-cover" loading="lazy" />
      <span class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
      <span class="relative mt-auto flex w-full items-end justify-between gap-3 p-4 text-white lg:p-5">
        <span class="flex min-w-0 flex-col gap-0.5">
          <span class="font-display text-lg font-extrabold leading-tight lg:text-2xl">{{ banner.headline }}</span>
          <span class="text-[13px] opacity-85">{{ banner.sponsor }}</span>
        </span>
        <span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-ink"><AppIcon name="chevron-right" /></span>
      </span>
      <SponsoredTag tone="onDark" class="absolute left-3 top-3" />
    </template>
    <template v-else>
      <span class="photo-ph absolute inset-0" />
      <span class="relative flex w-full flex-col justify-between gap-2 p-4 lg:p-6">
        <SponsoredTag class="self-start" />
        <span class="font-display text-xl font-extrabold leading-[1.1] tracking-tight lg:text-[30px]">{{ banner.headline }}</span>
        <span class="flex items-center justify-between gap-3">
          <span class="truncate text-[13px] font-semibold text-ink-2">{{ banner.sponsor }}</span>
          <span class="flex h-9 shrink-0 items-center gap-1 rounded-full bg-ink px-3.5 text-[13px] font-bold text-white">{{ banner.external ? 'Learn more' : 'Take a look' }}<AppIcon name="chevron-right" :size="16" /></span>
        </span>
      </span>
    </template>
  </component>
</template>
