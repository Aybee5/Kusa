<script setup lang="ts">
import type { NuxtError } from '#app'
const props = defineProps<{ error: NuxtError }>()
const notFound = computed(() => props.error.statusCode === 404)
</script>

<template>
  <div class="flex min-h-dvh flex-col items-center justify-center gap-4 bg-paper px-6 text-center text-ink">
    <BrandMark />
    <h1 class="font-display text-3xl font-extrabold tracking-tight">{{ notFound ? 'We couldn’t find that page' : 'Something went wrong' }}</h1>
    <p class="max-w-[360px] text-[15px] text-ink-2">
      {{ notFound ? 'The business or product may have been removed, or the link is wrong.' : 'Please try again in a moment.' }}
    </p>
    <button type="button" class="btn-primary" @click="clearError({ redirect: '/' })">Back to Kusa</button>
  </div>
</template>
