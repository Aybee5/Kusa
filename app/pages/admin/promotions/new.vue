<script setup lang="ts">
import type { Promotion } from '~/services/api'

definePageMeta({ layout: 'admin' })
const toast = useToast()

async function saved(p: Promotion) {
  await refreshNuxtData('admin-promotions')
  toast.show(p.state === 'running' ? 'Promotion is live' : `Scheduled from ${shortDate(p.startsAt)}`)
  await navigateTo({ path: '/admin/promotions', query: { tab: p.state === 'running' ? 'running' : 'scheduled' } })
}

useSeoMeta({ title: 'New promotion · Kusa admin', robots: 'noindex' })
</script>

<template>
  <div class="flex flex-col gap-1">
    <NuxtLink to="/admin/promotions" class="flex items-center gap-1 self-start py-1 text-sm font-bold text-muted"><AppIcon name="chevron-left" :size="18" />Promotions</NuxtLink>
    <h1 class="font-display text-[34px] font-extrabold tracking-tight">New promotion</h1>
    <p class="text-[15px] text-muted">For deals agreed outside the app, free trials, or Kusa’s own banners. It starts without needing approval.</p>
  </div>
  <div class="max-w-[760px] rounded-[18px] border border-line bg-surface p-4 lg:p-6">
    <PromotionForm admin @saved="saved" />
  </div>
</template>
