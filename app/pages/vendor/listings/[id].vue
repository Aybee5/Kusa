<script setup lang="ts">
definePageMeta({ layout: 'vendor' })

const route = useRoute()
const api = useApi()
const toast = useToast()
const { user } = useRequireRole('vendor')
const id = String(route.params.id)
const { data: products } = await useAsyncData('my-products', () => (user.value?.vendorId ? api.vendorProducts() : Promise.resolve([])), { watch: [() => user.value?.vendorId], server: false })
const product = computed(() => products.value?.find((p) => p.id === id) ?? null)

async function saved() {
  await refreshNuxtData('my-products')
  toast.show('Product saved')
  await navigateTo('/vendor/listings')
}

const confirming = ref(false)
async function remove() {
  try {
    await api.deleteProduct(id)
    await refreshNuxtData('my-products')
    toast.show('Product deleted')
    await navigateTo('/vendor/listings')
  } catch (e) {
    confirming.value = false
    toast.show((e as Error).message)
  }
}

useSeoMeta({ title: 'Edit product · Kusa', robots: 'noindex' })
</script>

<template>
  <div class="mx-auto flex max-w-[640px] flex-col gap-4 px-5 pb-8 pt-3 lg:px-8 lg:pt-8">
    <div class="flex items-center gap-2">
      <NuxtLink to="/vendor/listings" aria-label="Back" class="-ml-2.5 flex size-11 items-center justify-center text-ink"><AppIcon name="chevron-left" :size="24" /></NuxtLink>
      <h1 class="font-display text-2xl font-extrabold tracking-tight">Edit product</h1>
    </div>
    <div v-if="!products" class="h-80 animate-pulse rounded-2xl bg-sand" />
    <p v-else-if="!product" class="py-10 text-center text-sm text-muted">This product doesn’t exist any more. <NuxtLink to="/vendor/listings" class="font-bold">Back to listings</NuxtLink></p>
    <template v-else>
      <ProductForm :key="product.id" :product="product" @saved="saved" />
      <div class="border-t border-line pt-4">
        <button v-if="!confirming" type="button" class="btn-danger-outline w-full" @click="confirming = true"><AppIcon name="trash" :size="18" />Delete product</button>
        <div v-else class="flex flex-col gap-3 rounded-2xl border-[1.5px] border-danger bg-surface p-4" role="alertdialog" aria-labelledby="del-t">
          <strong id="del-t" class="text-[15px]">Delete “{{ product.name }}”?</strong>
          <span class="text-[13px] text-muted">It disappears from your page and its view counts are removed. To hide it for a while instead, mark it sold out.</span>
          <div class="flex gap-2">
            <button type="button" class="btn-outline flex-1" @click="confirming = false">Keep it</button>
            <button type="button" class="btn flex-1 bg-danger text-white" @click="remove">Delete</button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
