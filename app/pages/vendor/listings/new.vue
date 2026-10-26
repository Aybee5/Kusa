<script setup lang="ts">
definePageMeta({ layout: 'vendor' })

const api = useApi()
const toast = useToast()
const { user } = useRequireRole('vendor')

const name = ref('')
const price = ref<number | null>(null)
const description = ref('')
const image = ref<string | null>(null)
const saving = ref(false)
const valid = computed(() => name.value.trim().length > 1 && (price.value ?? 0) > 0)

async function addPhoto() {
  image.value = await pickPhoto()
}

async function save() {
  if (!valid.value || !user.value?.vendorId) return
  saving.value = true
  try {
    const imageKey = image.value ? (await api.uploadPhoto(image.value, 'product')).key : undefined
    await api.createProduct({ name: name.value.trim(), price: Number(price.value), description: description.value.trim(), imageKey })
    await refreshNuxtData('my-products')
    toast.show('Product added')
    await navigateTo('/vendor/listings')
  } catch (e) {
    toast.show((e as Error).message)
    saving.value = false
  }
}

useSeoMeta({ title: 'Add product · Kusa', robots: 'noindex' })
</script>

<template>
  <form class="mx-auto flex max-w-[640px] flex-col gap-4 px-5 pb-8 pt-3 lg:px-8 lg:pt-8" @submit.prevent="save">
    <div class="flex items-center gap-2">
      <NuxtLink to="/vendor/listings" aria-label="Back" class="-ml-2.5 flex size-11 items-center justify-center text-ink"><AppIcon name="chevron-left" :size="24" /></NuxtLink>
      <h1 class="font-display text-2xl font-extrabold tracking-tight">Add a product</h1>
    </div>

    <button type="button" class="relative flex h-48 cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-[1.5px] border-dashed border-[#9AA39E] bg-surface text-sm font-bold" @click="addPhoto">
      <img v-if="image" :src="image" alt="Product photo preview" class="absolute inset-0 size-full object-cover" />
      <template v-else><AppIcon name="camera" :size="26" />Add a photo</template>
    </button>

    <div class="flex flex-col gap-1.5">
      <label for="pname" class="label">Product name</label>
      <input id="pname" v-model="name" type="text" placeholder="e.g. Small chops party pack" class="field" required />
    </div>
    <div class="flex flex-col gap-1.5">
      <label for="pprice" class="label">Price (₦)</label>
      <input id="pprice" v-model.number="price" type="number" inputmode="numeric" min="0" step="50" placeholder="e.g. 18000" class="field" required />
    </div>
    <div class="flex flex-col gap-1.5">
      <label for="pdesc" class="label">Description</label>
      <textarea id="pdesc" v-model="description" rows="4" placeholder="What's included, sizes, how far ahead to order…" class="field h-auto resize-none py-3" />
    </div>
    <button type="submit" class="btn-dark h-[54px] text-base" :disabled="!valid || saving">{{ saving ? 'Saving…' : 'Add product' }}</button>
  </form>
</template>
