<script setup lang="ts">
definePageMeta({ layout: 'vendor' })
useRequireRole('vendor')
const toast = useToast()

async function saved() {
  await refreshNuxtData('my-products')
  toast.show('Product added')
  await navigateTo('/vendor/listings')
}

useSeoMeta({ title: 'Add product · Kusa', robots: 'noindex' })
</script>

<template>
  <div class="mx-auto flex max-w-[640px] flex-col gap-4 px-5 pb-8 pt-3 lg:px-8 lg:pt-8">
    <div class="flex items-center gap-2">
      <NuxtLink to="/vendor/listings" aria-label="Back" class="-ml-2.5 flex size-11 items-center justify-center text-ink"><AppIcon name="chevron-left" :size="24" /></NuxtLink>
      <h1 class="font-display text-2xl font-extrabold tracking-tight">Add a product</h1>
    </div>
    <ProductForm @saved="saved" />
  </div>
</template>
