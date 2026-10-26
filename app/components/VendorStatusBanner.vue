<script setup lang="ts">
import type { Vendor } from '#shared/types'
defineProps<{ vendor: Vendor }>()
</script>

<template>
  <div v-if="vendor.status === 'verified'" class="flex items-center gap-3 rounded-2xl bg-palm p-3.5 text-white">
    <VerifiedBadge :size="30" inverted />
    <div class="flex flex-col gap-0.5"><strong class="text-[15px]">You're verified</strong><span class="text-[13px] opacity-90">Your badge is showing to shoppers near you.</span></div>
  </div>
  <div v-else-if="vendor.status === 'pending'" class="flex items-center gap-3 rounded-2xl bg-amber-tint p-3.5 text-[#5C3B00]">
    <AppIcon name="clock" :size="28" />
    <div class="flex flex-col gap-0.5">
      <strong class="text-[15px]">{{ vendor.documents.idType ? 'Under review' : 'Finish verification' }}</strong>
      <span class="text-[13px]">
        <template v-if="vendor.documents.idType">We're checking your documents. Your shop goes live once you're verified.</template>
        <template v-else>Upload your ID so we can verify you. <NuxtLink to="/vendor/signup?step=3" class="font-bold text-[#5C3B00] underline">Continue</NuxtLink></template>
      </span>
    </div>
  </div>
  <div v-else-if="vendor.status === 'changes'" class="flex items-center gap-3 rounded-2xl bg-info-tint p-3.5 text-info-ink">
    <AppIcon name="flag" :size="28" />
    <div class="flex flex-col gap-0.5"><strong class="text-[15px]">We need a few changes</strong><span class="text-[13px]"><template v-if="vendor.reviewNote">“{{ vendor.reviewNote }}” </template>Fix this, then <NuxtLink to="/vendor/signup?step=3" class="font-bold text-info-ink underline">upload again</NuxtLink>.</span></div>
  </div>
  <div v-else class="flex items-center gap-3 rounded-2xl bg-danger-tint p-3.5 text-[#7E1710]">
    <AppIcon name="ban" :size="28" />
    <div class="flex flex-col gap-0.5">
      <strong class="text-[15px]">{{ vendor.status === 'rejected' ? 'Application not approved' : 'Shop suspended' }}</strong>
      <span class="text-[13px]">Your shop is hidden from search.<template v-if="vendor.suspensionReason || vendor.reviewNote"> Reason: {{ vendor.suspensionReason || vendor.reviewNote }}.</template> <a href="mailto:support@kusa.ng" class="font-bold text-[#7E1710] underline">Contact support</a></span>
    </div>
  </div>
</template>
