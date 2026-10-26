<script setup lang="ts">
definePageMeta({ layout: 'vendor' })

const api = useApi()
const { user } = useRequireRole('vendor')
const vendorId = computed(() => user.value?.vendorId ?? '')
const { data: vendor } = await useAsyncData('my-vendor', () => (vendorId.value ? api.getMyVendor(vendorId.value) : Promise.resolve(null)), { watch: [vendorId], server: false })

watch(vendor, (v) => {
  if (v?.status === 'verified') navigateTo(`/v/${v.slug}`, { replace: true })
}, { immediate: true })
</script>

<template>
  <div class="mx-auto flex max-w-[640px] flex-col gap-4 px-5 pb-8 pt-5 lg:px-8 lg:pt-8">
    <h1 class="font-display text-[28px] font-extrabold tracking-tight">My shop</h1>
    <template v-if="vendor && vendor.status !== 'verified'">
      <VendorStatusBanner :vendor="vendor" />
      <p class="text-sm text-ink-2">Your public page at <strong>kusa.ng/v/{{ vendor.slug }}</strong> goes live as soon as you're verified.</p>
    </template>
  </div>
</template>
