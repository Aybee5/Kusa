<script setup lang="ts">
import type { Promotion } from '~/services/api'

definePageMeta({ layout: 'vendor' })
useRequireRole('vendor')
const toast = useToast()

async function saved(p: Promotion) {
  await refreshNuxtData('my-promotions')
  toast.show(p.price ? 'Request sent. We’ll start it once payment is confirmed.' : 'Request sent')
  await navigateTo('/vendor/promote')
}

useSeoMeta({ title: 'New promotion · Kusa', robots: 'noindex' })
</script>

<template>
  <div class="mx-auto flex max-w-[760px] flex-col gap-5 px-5 pb-10 pt-3 lg:px-8 lg:pt-8">
    <div class="flex items-center gap-2">
      <NuxtLink to="/vendor/promote" aria-label="Back" class="-ml-2.5 flex size-11 items-center justify-center text-ink"><AppIcon name="chevron-left" :size="24" /></NuxtLink>
      <h1 class="font-display text-2xl font-extrabold tracking-tight lg:text-[30px]">New promotion</h1>
    </div>
    <PromotionForm @saved="saved" />
  </div>
</template>
