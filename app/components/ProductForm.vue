<script setup lang="ts">
import type { Product, ProductOption } from '#shared/types'
import type { ProductUpdate } from '#shared/types/api'

// Add or edit a product: photo, name, price or size options, description.
const props = defineProps<{ product?: Product | null }>()
const emit = defineEmits<{ saved: [product: Product] }>()
const api = useApi()
const toast = useToast()
const asset = useAssetUrl()

const name = ref(props.product?.name ?? '')
const price = ref<number | null>(props.product?.price ?? null)
const description = ref(props.product?.description ?? '')
const useOptions = ref(!!props.product?.options?.length)
const options = ref<{ label: string; price: number | null }[]>(props.product?.options?.map((o) => ({ ...o })) ?? [{ label: '', price: null }, { label: '', price: null }])
// Photo: undefined key = unchanged, null = removed, string = new upload.
const photo = ref<string | null>(props.product?.image ?? null)
const photoKey = ref<string | null | undefined>(undefined)
const uploading = ref(false)
const saving = ref(false)

const cleanOptions = computed<ProductOption[]>(() => options.value
  .filter((o) => o.label.trim() && (o.price ?? 0) > 0)
  .map((o) => ({ label: o.label.trim(), price: Number(o.price) })))
const problem = computed(() => {
  if (name.value.trim().length < 2) return 'Add a product name'
  if (useOptions.value) {
    if (cleanOptions.value.length < 2) return 'Add at least two options with prices'
    if (options.value.some((o) => (o.label.trim() || o.price) && !(o.label.trim() && (o.price ?? 0) >= 50))) return 'Each option needs a name and a price'
  } else if ((price.value ?? 0) < 50) return 'Add a price'
  if (uploading.value) return 'Uploading photo…'
  return ''
})

async function choosePhoto() {
  const p = await pickPhoto()
  if (!p) return
  photo.value = p
  uploading.value = true
  try {
    photoKey.value = (await api.uploadPhoto(p, 'product')).key
  } catch (e) {
    photo.value = props.product?.image ?? null
    photoKey.value = undefined
    toast.show((e as Error).message)
  } finally {
    uploading.value = false
  }
}
function removePhoto() {
  photo.value = null
  photoKey.value = null
}

async function save() {
  if (problem.value || saving.value) return
  saving.value = true
  try {
    const base = {
      name: name.value.trim(),
      description: description.value.trim(),
      price: useOptions.value ? Math.min(...cleanOptions.value.map((o) => o.price)) : Number(price.value),
      options: useOptions.value ? cleanOptions.value : [],
    }
    const saved = props.product
      ? await api.updateProduct(props.product.id, { ...base, ...(photoKey.value !== undefined ? { imageKey: photoKey.value } : {}) } satisfies ProductUpdate)
      : await api.createProduct({ ...base, imageKey: photoKey.value ?? undefined })
    emit('saved', saved)
  } catch (e) {
    toast.show((e as Error).message)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <form class="flex flex-col gap-4" @submit.prevent="save">
    <div class="relative">
      <button type="button" class="relative flex h-48 w-full cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-[1.5px] border-dashed border-[#9AA39E] bg-surface text-sm font-bold" @click="choosePhoto">
        <img v-if="photo" :src="asset(photo)" alt="Product photo" class="absolute inset-0 size-full object-cover" />
        <span v-if="photo" class="relative flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[13px]"><AppIcon name="camera" :size="16" />{{ uploading ? 'Uploading…' : 'Change photo' }}</span>
        <template v-else><AppIcon name="camera" :size="26" />Add a photo</template>
      </button>
      <button v-if="photo" type="button" class="absolute right-2.5 top-2.5 flex size-9 cursor-pointer items-center justify-center rounded-full bg-white/90 text-danger-ink" aria-label="Remove photo" @click="removePhoto"><AppIcon name="trash" :size="18" /></button>
    </div>

    <div class="flex flex-col gap-1.5">
      <label for="pname" class="label">Product name</label>
      <input id="pname" v-model="name" type="text" maxlength="80" placeholder="e.g. Small chops party pack" class="field" />
    </div>

    <label class="flex cursor-pointer items-center gap-2.5 text-[15px] font-semibold">
      <input v-model="useOptions" type="checkbox" class="size-5 accent-palm" />Different sizes or quantities, each with its own price
    </label>

    <div v-if="!useOptions" class="flex flex-col gap-1.5">
      <label for="pprice" class="label">Price (₦)</label>
      <input id="pprice" v-model.number="price" type="number" inputmode="numeric" min="50" step="50" placeholder="e.g. 18000" class="field" />
    </div>
    <fieldset v-else class="flex flex-col gap-2">
      <legend class="label pb-2">Options</legend>
      <div v-for="(o, i) in options" :key="i" class="flex items-center gap-2">
        <label :for="`opt-l-${i}`" class="sr-only">Option {{ i + 1 }} name</label>
        <input :id="`opt-l-${i}`" v-model="o.label" type="text" maxlength="30" placeholder="e.g. 50 pcs" class="field min-w-0 flex-[3]" />
        <label :for="`opt-p-${i}`" class="sr-only">Option {{ i + 1 }} price</label>
        <input :id="`opt-p-${i}`" v-model.number="o.price" type="number" inputmode="numeric" min="50" step="50" placeholder="₦ price" class="field min-w-0 flex-[2]" />
        <button type="button" class="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl text-muted hover:bg-sand" :aria-label="`Remove option ${i + 1}`" :disabled="options.length <= 2" @click="options.splice(i, 1)"><AppIcon name="x" :size="18" /></button>
      </div>
      <button v-if="options.length < 8" type="button" class="flex min-h-10 cursor-pointer items-center gap-1.5 self-start text-sm font-bold text-palm" @click="options.push({ label: '', price: null })"><AppIcon name="plus" :size="16" />Add option</button>
    </fieldset>

    <div class="flex flex-col gap-1.5">
      <label for="pdesc" class="label">Description</label>
      <textarea id="pdesc" v-model="description" rows="4" maxlength="1000" placeholder="What's included, sizes, how far ahead to order…" class="field h-auto resize-none py-3" />
    </div>
    <button type="submit" class="btn-dark h-[54px] text-base" :disabled="!!problem || saving">{{ saving ? 'Saving…' : problem || (product ? 'Save changes' : 'Add product') }}</button>
  </form>
</template>
