<script setup lang="ts">
import type { VendorStatus } from '~/types'

definePageMeta({ layout: 'admin' })

const route = useRoute()
const api = useApi()
const toast = useToast()
const id = String(route.params.id)

const { data: vendor, refresh } = await useAsyncData(`admin-vendor-${id}`, () => api.adminVendor(id))
if (!vendor.value) throw createError({ statusCode: 404, statusMessage: 'Vendor not found', fatal: true })
const { data: products } = await useAsyncData(`admin-vendor-products-${id}`, () => api.vendorProducts(id))

const checks = reactive({ phone: true, name: false, face: false, place: false })
const checkList = [
  { key: 'phone' as const, label: 'Phone number verified', note: 'Automatic' },
  { key: 'name' as const, label: 'Name on ID matches the account name', note: '' },
  { key: 'face' as const, label: 'Face in selfie matches the ID photo', note: '' },
  { key: 'place' as const, label: 'Business photo and location look genuine', note: '' },
]
const done = computed(() => Object.values(checks).filter(Boolean).length)
const note = ref('')
const suspendReason = ref('')
const decision = ref<VendorStatus | null>(null)

const decisionText: Partial<Record<VendorStatus, string>> = {
  verified: 'Approved. The badge is live and their listings are now visible to shoppers.',
  changes: 'Changes requested. The vendor gets your note by SMS.',
  rejected: 'Application rejected. The vendor has been told why.',
  suspended: 'Account suspended. The shop is hidden from search.',
}
const before = vendor.value.status

async function decide(status: VendorStatus) {
  await api.setVendorStatus(id, status, status === 'suspended' ? suspendReason.value || 'Other' : undefined)
  decision.value = status
  await Promise.all([refresh(), refreshNuxtData(['admin-counts', 'admin-vendors'])])
  toast.show(decisionText[status] ?? 'Saved')
}

async function undo() {
  await api.setVendorStatus(id, before)
  decision.value = null
  await Promise.all([refresh(), refreshNuxtData(['admin-counts', 'admin-vendors'])])
}

const pillTone: Partial<Record<VendorStatus, string>> = {
  verified: 'bg-palm-tint text-palm', changes: 'bg-info-tint text-info-ink', rejected: 'bg-danger-tint text-danger-ink', suspended: 'bg-danger-tint text-danger-ink',
}

useSeoMeta({ title: () => `${vendor.value?.name} · Kusa admin`, robots: 'noindex' })
</script>

<template>
  <template v-if="vendor">
    <nav aria-label="Breadcrumb" class="flex items-center gap-1.5 text-sm text-muted">
      <NuxtLink to="/admin/vendors" class="py-1.5 font-semibold">Vendors</NuxtLink>
      <AppIcon name="chevron-right" :size="14" />
      <span>{{ vendor.name }}</span>
    </nav>

    <div class="flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-3.5">
        <span class="flex size-[60px] items-center justify-center rounded-[18px] font-display text-xl font-extrabold" :style="{ backgroundColor: vendor.tint }">{{ vendor.initials }}</span>
        <div class="flex flex-col gap-1.5">
          <div class="flex flex-wrap items-center gap-2.5">
            <h1 class="font-display text-[30px] font-extrabold tracking-tight">{{ vendor.name }}</h1>
            <StatusPill :status="vendor.status" />
          </div>
          <span class="text-sm text-muted">Submitted {{ formatDate(vendor.submittedAt ?? vendor.joinedAt) }} · Owner: {{ vendor.ownerName }}</span>
        </div>
      </div>
      <div class="flex flex-wrap gap-2">
        <button type="button" class="h-[46px] cursor-pointer rounded-xl border-[1.5px] border-danger-line bg-surface px-[18px] text-sm font-bold text-danger-ink" @click="decide('rejected')">Reject</button>
        <button type="button" class="h-[46px] cursor-pointer rounded-xl border-[1.5px] border-ink bg-surface px-[18px] text-sm font-bold" @click="decide('changes')">Request changes</button>
        <button type="button" class="flex h-[46px] cursor-pointer items-center gap-2 rounded-xl bg-palm px-5 text-sm font-bold text-white" :disabled="done < 4" @click="decide('verified')">
          <AppIcon name="check" :size="18" :stroke="2.2" />Approve &amp; verify
        </button>
      </div>
    </div>

    <div v-if="decision" class="flex flex-wrap items-center justify-between gap-3 rounded-[14px] px-[18px] py-3.5" :class="pillTone[decision]">
      <span class="text-sm font-bold">{{ decisionText[decision] }}</span>
      <button type="button" class="h-9 cursor-pointer rounded-[10px] border-[1.5px] border-current bg-transparent px-3.5 text-[13px] font-bold" @click="undo">Undo</button>
    </div>

    <div class="grid items-start gap-[18px] lg:grid-cols-2">
      <div class="flex flex-col gap-[18px]">
        <section class="flex flex-col gap-3.5 rounded-[18px] border border-line bg-surface p-5">
          <h2 class="text-[17px] font-bold">Documents</h2>
          <div class="grid grid-cols-3 gap-2.5">
            <figure class="flex flex-col gap-1.5">
              <div class="photo-ph flex h-[150px] items-center justify-center rounded-xl bg-[#ECE6D8] px-2 text-center text-xs text-ink-2">{{ vendor.documents.idType || 'Not uploaded' }}</div>
              <figcaption class="text-[13px] font-semibold">Government ID</figcaption>
            </figure>
            <figure class="flex flex-col gap-1.5">
              <div class="photo-ph flex h-[150px] items-center justify-center rounded-xl bg-[#ECE6D8] px-2 text-center text-xs text-ink-2">{{ vendor.documents.hasSelfie ? 'Selfie with ID' : 'Not uploaded' }}</div>
              <figcaption class="text-[13px] font-semibold">Selfie</figcaption>
            </figure>
            <figure class="flex flex-col gap-1.5">
              <div class="photo-ph flex h-[150px] items-center justify-center rounded-xl px-2 text-center text-xs text-ink-2" :style="{ backgroundColor: vendor.coverTint }">{{ vendor.documents.hasBusinessProof ? 'Photo of business' : 'Not provided' }}</div>
              <figcaption class="text-[13px] font-semibold">Proof of business</figcaption>
            </figure>
          </div>
        </section>

        <section class="flex flex-col gap-2.5 rounded-[18px] border border-line bg-surface p-5">
          <div class="flex items-baseline justify-between gap-3">
            <h2 class="text-[17px] font-bold">Reviewer checklist</h2>
            <span class="text-[13px] text-muted">{{ done }} of 4 done</span>
          </div>
          <label v-for="c in checkList" :key="c.key" class="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm" :class="checks[c.key] ? 'bg-palm-tint' : 'bg-paper'">
            <input v-model="checks[c.key]" type="checkbox" class="size-5 accent-palm" />
            <span class="flex-1 font-semibold">{{ c.label }}</span>
            <span class="text-xs text-muted">{{ c.note }}</span>
          </label>
          <p v-if="done < 4" class="mt-1 text-[13px] text-muted">Tick every check to enable Approve.</p>
        </section>
      </div>

      <div class="flex flex-col gap-[18px]">
        <section class="flex flex-col gap-1 rounded-[18px] border border-line bg-surface p-5">
          <h2 class="mb-2 text-[17px] font-bold">Business details</h2>
          <dl class="grid grid-cols-[140px_1fr] gap-x-3 gap-y-2.5 text-sm">
            <dt class="text-muted">Category</dt><dd class="font-semibold">{{ categoryLabel(vendor.category) }}</dd>
            <dt class="text-muted">WhatsApp</dt><dd class="font-semibold">{{ maskPhone(vendor.phone) }} <span class="text-palm">· verified by SMS</span></dd>
            <dt class="text-muted">Location</dt><dd class="font-semibold">{{ vendor.area }}, {{ vendor.city }}<template v-if="vendor.landmark"> · {{ vendor.landmark }}</template></dd>
            <dt class="text-muted">Gets products to</dt><dd class="font-semibold">{{ [vendor.pickup && 'Pickup', vendor.delivery && 'Delivery'].filter(Boolean).join(' and ') }}</dd>
            <dt class="text-muted">Listings</dt><dd class="font-semibold">{{ vendor.listingCount }} {{ vendor.status === 'verified' ? '(live)' : '(hidden until verified)' }}</dd>
            <dt v-if="vendor.ratingCount" class="text-muted">Rating</dt><dd v-if="vendor.ratingCount" class="font-semibold">★ {{ vendor.ratingAverage.toFixed(1) }} from {{ vendor.ratingCount }} ratings</dd>
          </dl>
          <div v-if="products?.length" class="mt-3 grid grid-cols-4 gap-2">
            <PhotoBox v-for="p in products.slice(0, 4)" :key="p.id" :tint="p.tint" :src="p.image" class="h-[72px] rounded-[10px]" />
          </div>
        </section>

        <section class="flex flex-col gap-2 rounded-[18px] border border-line bg-surface p-5">
          <label for="note" class="text-[17px] font-bold">Note</label>
          <textarea id="note" v-model="note" rows="3" placeholder="If you request changes or reject, the vendor gets this note. Otherwise only admins see it." class="field h-auto resize-y py-3 text-sm" />
        </section>

        <section class="flex flex-col gap-2.5 rounded-[18px] border border-line bg-surface p-5">
          <h2 class="text-[17px] font-bold">Account actions</h2>
          <p class="text-sm text-muted">Suspending hides the shop and all listings from search and blocks sign-in until you reinstate it.</p>
          <div class="flex flex-wrap gap-2">
            <label for="sreason" class="sr-only">Suspension reason</label>
            <select id="sreason" v-model="suspendReason" class="h-11 min-w-[200px] flex-1 rounded-[10px] border-[1.5px] border-line bg-surface px-2.5 text-sm">
              <option value="">Choose a reason…</option>
              <option>Fake or mismatched ID</option>
              <option>Prohibited products</option>
              <option>Reports of non-delivery</option>
              <option>Other</option>
            </select>
            <button v-if="vendor.status !== 'suspended'" type="button" class="h-11 cursor-pointer rounded-[10px] border-[1.5px] border-danger-line bg-surface px-4 text-sm font-bold text-danger-ink" :disabled="!suspendReason" @click="decide('suspended')">Suspend account</button>
            <button v-else type="button" class="h-11 cursor-pointer rounded-[10px] border-[1.5px] border-ink bg-surface px-4 text-sm font-bold" @click="decide('verified')">Reinstate</button>
          </div>
        </section>
      </div>
    </div>
  </template>
</template>
