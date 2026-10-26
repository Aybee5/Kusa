<script setup lang="ts">
import type { CategoryId, Product } from '#shared/types'
import type { AdminVendor, Promotion, PromotionKind } from '~/services/api'

// Request a promotion (vendors) or create one directly (admins: any business
// or a house banner, any duration and price).
const props = defineProps<{ admin?: boolean }>()
const emit = defineEmits<{ saved: [promotion: Promotion] }>()

const api = useApi()
const toast = useToast()

const { data: plans } = await useAsyncData('promotion-plans', () => api.promotionPlans(), { server: false })
const { data: myVendor } = await useAsyncData('promo-my-vendor', () => (props.admin ? Promise.resolve(null) : api.getMyVendor()), { server: false })
const { data: vendors } = await useAsyncData('admin-promo-vendors', async () =>
  props.admin ? (await api.adminVendors()).filter((v) => v.status === 'verified').sort((a, b) => a.name.localeCompare(b.name)) : [] as AdminVendor[], { server: false })

const kind = ref<PromotionKind>('featured')
const vendorId = ref('')
const productId = ref('')
const headline = ref('')
const image = ref<string | null>(null)
const linkUrl = ref('')
const city = ref<string | null>(null)
const category = ref<CategoryId | null>(null)
const durationDays = ref(7)
const price = ref(0)
const startDate = ref(todayLagos())
const paymentRef = ref('')
const saving = ref(false)

const vendor = computed(() => (props.admin ? vendors.value?.find((v) => v.id === vendorId.value) : myVendor.value) ?? null)
watch(vendor, (v) => {
  if (v && city.value === null && !props.admin) city.value = v.city
}, { immediate: true })

const { data: products } = await useAsyncData('promo-products', async (): Promise<Product[]> => {
  if (props.admin) return vendorId.value ? api.adminVendorProducts(vendorId.value) : []
  return api.vendorProducts()
}, { watch: [vendorId], server: false })
watch(vendorId, () => (productId.value = ''))
const availableProducts = computed(() => (products.value ?? []).filter((p) => p.available))

const plan = computed(() => plans.value?.plans.find((p) => p.kind === kind.value))
const vendorPrice = computed(() => plan.value?.prices.find((p) => p.days === durationDays.value)?.price)
watch(plan, (p) => {
  if (!props.admin && p && !p.prices.some((x) => x.days === durationDays.value)) durationDays.value = p.prices[0]?.days ?? 7
})
const cityOptions = computed(() => [...new Set([...(plans.value?.cities ?? []), ...(vendor.value?.city ? [vendor.value.city] : [])])].sort())
const houseBanner = computed(() => props.admin && kind.value === 'banner' && !vendorId.value)
const endDate = computed(() => addDays(startDate.value, durationDays.value))

const valid = computed(() => {
  if (props.admin && kind.value !== 'banner' && !vendorId.value) return false
  if (kind.value === 'product' && !productId.value) return false
  if (kind.value === 'banner' && headline.value.trim().length < 3) return false
  if (houseBanner.value && !linkUrl.value.trim()) return false
  if (!props.admin && vendorPrice.value === undefined) return false
  return durationDays.value > 0 && !!startDate.value
})

const preview = computed(() => ({
  headline: headline.value.trim() || 'Your headline here',
  imageUrl: image.value,
  sponsor: vendor.value?.name ?? 'Kusa',
  tint: vendor.value?.coverTint ?? '#E3F1EA',
  link: '/',
  external: false,
}))

async function addImage() {
  const photo = await pickPhoto('library')
  if (photo) image.value = photo
}

const kindIcons: Record<PromotionKind, string> = { featured: 'store', banner: 'megaphone', product: 'tag' }
const fromPrice = (k: PromotionKind) => plans.value?.plans.find((p) => p.kind === k)?.prices[0]

async function submit() {
  if (!valid.value || saving.value) return
  saving.value = true
  try {
    const imageKey = kind.value === 'banner' && image.value ? (await api.uploadPhoto(image.value, 'banner')).key : undefined
    const common = {
      kind: kind.value,
      productId: kind.value === 'featured' ? undefined : productId.value || undefined,
      headline: kind.value === 'banner' ? headline.value.trim() : undefined,
      imageKey,
      city: city.value,
      category: category.value,
      durationDays: durationDays.value,
      startDate: startDate.value,
    }
    const saved = props.admin
      ? await api.createPromotion({ ...common, vendorId: vendorId.value || undefined, linkUrl: houseBanner.value ? linkUrl.value.trim() : undefined, price: price.value })
      : await api.requestPromotion({ ...common, paymentRef: paymentRef.value.trim() || undefined })
    emit('saved', saved)
  } catch (e) {
    toast.show((e as Error).message)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <form class="flex flex-col gap-6" @submit.prevent="submit">
    <!-- What -->
    <fieldset class="flex flex-col gap-2.5">
      <legend class="mb-2.5 text-[17px] font-bold">What would you like to promote?</legend>
      <div class="grid gap-2.5 lg:grid-cols-3">
        <label
          v-for="p in plans?.plans ?? []"
          :key="p.kind"
          class="flex cursor-pointer gap-3 rounded-2xl border-[1.5px] bg-surface p-3.5 lg:flex-col"
          :class="kind === p.kind ? 'border-palm ring-1 ring-palm' : 'border-line'"
        >
          <input v-model="kind" type="radio" name="kind" :value="p.kind" class="sr-only" />
          <span class="flex size-10 shrink-0 items-center justify-center rounded-xl" :class="kind === p.kind ? 'bg-palm text-white' : 'bg-palm-tint text-palm'"><AppIcon :name="kindIcons[p.kind]" /></span>
          <span class="flex min-w-0 flex-col gap-1">
            <span class="text-[15px] font-bold">{{ p.label }}</span>
            <span class="text-[13px] leading-snug text-muted">{{ p.description }}</span>
            <span v-if="!admin && fromPrice(p.kind)" class="text-[13px] font-bold">From {{ formatNaira(fromPrice(p.kind)!.price) }} · {{ fromPrice(p.kind)!.days }} days</span>
          </span>
        </label>
      </div>
      <div v-if="!plans" class="h-28 animate-pulse rounded-2xl bg-sand" />
    </fieldset>

    <!-- Admin: which business -->
    <div v-if="admin" class="flex flex-col gap-1.5">
      <label for="pf-vendor" class="label">Business</label>
      <select id="pf-vendor" v-model="vendorId" class="field">
        <option value="">{{ kind === 'banner' ? 'None: a Kusa banner with its own link' : 'Choose a business' }}</option>
        <option v-for="v in vendors" :key="v.id" :value="v.id">{{ v.name }} · {{ v.area }}, {{ v.city }}</option>
      </select>
    </div>

    <!-- Product -->
    <div v-if="kind === 'product' || (kind === 'banner' && vendor)" class="flex flex-col gap-1.5">
      <label for="pf-product" class="label">{{ kind === 'product' ? 'Product to promote' : 'Banner opens' }}</label>
      <select id="pf-product" v-model="productId" class="field">
        <option value="">{{ kind === 'product' ? 'Choose a product' : `${admin ? 'The' : 'Your'} shop page` }}</option>
        <option v-for="p in availableProducts" :key="p.id" :value="p.id">{{ kind === 'banner' ? 'Product: ' : '' }}{{ p.name }} · {{ formatNaira(p.options?.[0]?.price ?? p.price) }}</option>
      </select>
      <p v-if="kind === 'product' && products && !availableProducts.length" class="text-[13px] text-muted">
        No products available yet.<NuxtLink v-if="!admin" to="/vendor/listings/new" class="font-bold"> Add one first.</NuxtLink>
      </p>
    </div>

    <!-- Banner -->
    <div v-if="kind === 'banner'" class="flex flex-col gap-3">
      <div class="flex flex-col gap-1.5">
        <label for="pf-headline" class="label">Headline</label>
        <input id="pf-headline" v-model="headline" type="text" maxlength="60" placeholder="e.g. Fresh small chops for your party" class="field" />
        <span class="self-end text-xs text-muted">{{ headline.length }}/60</span>
      </div>
      <div v-if="houseBanner" class="flex flex-col gap-1.5">
        <label for="pf-link" class="label">Link</label>
        <input id="pf-link" v-model="linkUrl" type="text" inputmode="url" placeholder="https://… or /vendor/signup" class="field" />
      </div>
      <div class="flex flex-col gap-1.5">
        <span class="label">Preview</span>
        <PromoBanner :banner="preview" preview />
        <div class="flex flex-wrap items-center gap-2">
          <button type="button" class="btn-outline min-h-10 text-sm" @click="addImage"><AppIcon name="upload" :size="18" />{{ image ? 'Change image' : 'Add an image' }}</button>
          <button v-if="image" type="button" class="min-h-10 cursor-pointer px-2 text-sm font-bold text-muted" @click="image = null">Use a text banner</button>
          <span class="text-[13px] text-muted">Optional. Wide images work best (about 3:1). Without one, a text banner is used.</span>
        </div>
      </div>
    </div>

    <!-- Where -->
    <fieldset class="grid gap-3 lg:grid-cols-2">
      <legend class="mb-2.5 text-[17px] font-bold">Who should see it?</legend>
      <div class="flex flex-col gap-1.5">
        <label for="pf-city" class="label">City</label>
        <select id="pf-city" v-model="city" class="field">
          <option :value="null">All cities</option>
          <option v-for="c in cityOptions" :key="c" :value="c">Shoppers browsing {{ c }}</option>
        </select>
      </div>
      <div class="flex flex-col gap-1.5">
        <label for="pf-cat" class="label">Where on Kusa</label>
        <select id="pf-cat" v-model="category" class="field">
          <option :value="null">Home page and every search</option>
          <option v-for="c in CATEGORIES" :key="c.id" :value="c.id">Only when browsing {{ c.label }}</option>
        </select>
      </div>
    </fieldset>

    <!-- When -->
    <fieldset class="flex flex-col gap-3">
      <legend class="mb-2.5 text-[17px] font-bold">For how long?</legend>
      <div v-if="!admin" class="grid grid-cols-3 gap-2.5" role="radiogroup" aria-label="Duration">
        <label
          v-for="p in plan?.prices ?? []"
          :key="p.days"
          class="flex cursor-pointer flex-col items-center gap-0.5 rounded-2xl border-[1.5px] bg-surface px-2 py-3 text-center"
          :class="durationDays === p.days ? 'border-palm ring-1 ring-palm' : 'border-line'"
        >
          <input v-model="durationDays" type="radio" name="days" :value="p.days" class="sr-only" />
          <span class="text-[15px] font-bold">{{ p.days }} days</span>
          <span class="text-[13px] text-muted">{{ formatNaira(p.price) }}</span>
        </label>
      </div>
      <div class="grid gap-3" :class="admin ? 'grid-cols-2 lg:grid-cols-3' : 'lg:grid-cols-2'">
        <div v-if="admin" class="flex flex-col gap-1.5">
          <label for="pf-days" class="label">Days</label>
          <input id="pf-days" v-model.number="durationDays" type="number" min="1" max="365" class="field" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label for="pf-start" class="label">Start</label>
          <input id="pf-start" v-model="startDate" type="date" :min="todayLagos()" :max="addDays(todayLagos(), 60)" class="field" />
        </div>
        <div v-if="admin" class="flex flex-col gap-1.5">
          <label for="pf-price" class="label">Amount paid (₦)</label>
          <input id="pf-price" v-model.number="price" type="number" min="0" step="500" class="field" />
        </div>
      </div>
      <p class="flex items-center gap-1.5 text-[13px] text-muted">
        <AppIcon name="calendar" :size="16" />
        Runs {{ formatDate(startDate) }} to {{ formatDate(endDate) }}{{ admin ? '' : ', or for ' + durationDays + ' days from approval if that’s later' }}.
      </p>
    </fieldset>

    <!-- Pay (vendors) -->
    <section v-if="!admin && vendorPrice !== undefined" class="flex flex-col gap-3 rounded-2xl bg-ink p-4 text-white lg:p-5" aria-labelledby="pay-h">
      <div class="flex items-baseline justify-between gap-3">
        <h2 id="pay-h" class="text-[17px] font-bold">Total</h2>
        <span class="font-display text-[28px] font-extrabold">{{ formatNaira(vendorPrice) }}</span>
      </div>
      <p v-if="plans?.payment" class="text-sm leading-relaxed text-[#C9D1CC]">
        Transfer {{ formatNaira(vendorPrice) }} to <strong class="text-white">{{ plans.payment.accountName }}</strong>,
        {{ plans.payment.bankName }} <strong class="whitespace-nowrap text-white">{{ plans.payment.accountNumber }}</strong>.
        Your promotion starts once we confirm the payment.
      </p>
      <p v-else class="text-sm leading-relaxed text-[#C9D1CC]">After you send this, Kusa will contact you on WhatsApp with how to pay. Your promotion starts once we confirm the payment.</p>
      <div class="flex flex-col gap-1.5">
        <label for="pf-ref" class="text-[13px] font-bold">Transfer reference or sender name <span class="font-normal text-[#C9D1CC]">(optional, you can add it later)</span></label>
        <input id="pf-ref" v-model="paymentRef" type="text" maxlength="80" placeholder="e.g. TRF/1234 or Hadiza Umar" class="field" />
      </div>
    </section>

    <button type="submit" class="btn-dark h-[54px] text-base" :disabled="!valid || saving">
      {{ saving ? 'Sending…' : admin ? 'Create and start' : 'Send request' }}
    </button>
  </form>
</template>
