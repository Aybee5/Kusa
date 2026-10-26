<script setup lang="ts">
const { user, ready, signOut } = useSession()

async function out() {
  await signOut()
  await navigateTo('/')
}

useSeoMeta({ title: 'Account · Kusa', robots: 'noindex' })
</script>

<template>
  <div class="mx-auto flex max-w-[640px] flex-col gap-5 px-5 pb-8 pt-5 lg:pt-10">
    <h1 class="font-display text-[28px] font-extrabold tracking-tight lg:text-4xl">Account</h1>

    <template v-if="ready && user">
      <div class="card flex items-center gap-3.5 p-4">
        <span class="flex size-12 items-center justify-center rounded-full bg-palm-tint text-palm"><AppIcon name="user" :size="24" /></span>
        <div class="flex flex-col">
          <span class="text-base font-bold">{{ user.name }}</span>
          <span class="text-sm text-muted">{{ maskPhone(user.phone) }} · {{ user.role === 'vendor' ? 'Vendor' : 'Shopper' }}</span>
        </div>
      </div>
      <nav class="card flex flex-col divide-y divide-line" aria-label="Account">
        <NuxtLink to="/saved" class="flex min-h-14 items-center gap-3 px-4 text-[15px] font-semibold text-ink"><AppIcon name="heart" />Saved businesses<AppIcon name="chevron-right" class="ml-auto text-muted" /></NuxtLink>
        <NuxtLink v-if="user.role === 'vendor'" to="/vendor" class="flex min-h-14 items-center gap-3 px-4 text-[15px] font-semibold text-ink"><AppIcon name="store" />My shop dashboard<AppIcon name="chevron-right" class="ml-auto text-muted" /></NuxtLink>
        <NuxtLink v-else to="/vendor/signup" class="flex min-h-14 items-center gap-3 px-4 text-[15px] font-semibold text-ink"><AppIcon name="store" />Sell on Kusa<AppIcon name="chevron-right" class="ml-auto text-muted" /></NuxtLink>
        <button type="button" class="flex min-h-14 cursor-pointer items-center gap-3 px-4 text-left text-[15px] font-semibold text-danger-ink" @click="out"><AppIcon name="logout" />Sign out</button>
      </nav>
    </template>

    <div v-else-if="ready" class="card flex flex-col items-start gap-3 p-5">
      <p class="text-[15px] text-ink-2">Sign in to rate businesses and keep your saved list on every device.</p>
      <NuxtLink to="/signin?redirect=/account" class="btn-primary">Sign in with your phone</NuxtLink>
      <NuxtLink to="/vendor/signup" class="text-sm font-bold">Sell on Kusa instead</NuxtLink>
    </div>
  </div>
</template>
