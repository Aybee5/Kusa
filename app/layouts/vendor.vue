<script setup lang="ts">
const route = useRoute()
const { user, signOut } = useSession()
const items = computed(() => [
  { to: '/vendor', label: 'Home', icon: 'home', match: (p: string) => p === '/vendor' },
  { to: '/vendor/listings', label: 'Listings', icon: 'grid', match: (p: string) => p.startsWith('/vendor/listings') },
  { to: user.value?.vendorId ? `/vendor/shop` : '/vendor', label: 'My shop', icon: 'store', match: (p: string) => p.startsWith('/vendor/shop') },
  { to: '/account', label: 'Account', icon: 'user', match: (p: string) => p.startsWith('/account') },
])

async function out() {
  await signOut()
  await navigateTo('/')
}
</script>

<template>
  <div class="min-h-dvh lg:flex">
    <aside class="hidden w-[248px] shrink-0 flex-col gap-6 border-r border-line bg-surface px-4 py-6 lg:flex">
      <div class="px-2"><BrandMark /></div>
      <nav aria-label="Vendor" class="flex flex-col gap-0.5">
        <NuxtLink
          v-for="item in items.slice(0, 3)"
          :key="item.label"
          :to="item.to"
          :aria-current="item.match(route.path) ? 'page' : undefined"
          class="flex min-h-[42px] items-center gap-2.5 rounded-xl px-2.5 text-sm"
          :class="item.match(route.path) ? 'bg-palm-tint font-bold text-palm' : 'font-semibold text-ink-2 hover:bg-sand'"
        >
          <AppIcon :name="item.icon" :size="18" />{{ item.label }}
        </NuxtLink>
      </nav>
      <div class="mt-auto flex flex-col gap-0.5 border-t border-line pt-4">
        <NuxtLink to="/" class="flex min-h-[42px] items-center gap-2.5 rounded-xl px-2.5 text-sm font-semibold text-ink-2 hover:bg-sand"><AppIcon name="compass" :size="18" />Browse Kusa</NuxtLink>
        <button type="button" class="flex min-h-[42px] cursor-pointer items-center gap-2.5 rounded-xl px-2.5 text-left text-sm font-semibold text-ink-2 hover:bg-sand" @click="out">
          <AppIcon name="logout" :size="18" />Sign out
        </button>
      </div>
    </aside>

    <main class="min-w-0 flex-1 pb-[calc(64px+env(safe-area-inset-bottom))] lg:pb-0">
      <slot />
    </main>

    <nav aria-label="Vendor" class="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface lg:hidden">
      <div class="grid h-[64px] grid-cols-4 px-2">
        <NuxtLink
          v-for="item in items"
          :key="item.label"
          :to="item.to"
          :aria-current="item.match(route.path) ? 'page' : undefined"
          class="flex flex-col items-center justify-center gap-0.5 text-[11px]"
          :class="item.match(route.path) ? 'font-bold text-palm' : 'font-semibold text-muted'"
        >
          <AppIcon :name="item.icon" :size="24" />{{ item.label }}
        </NuxtLink>
      </div>
    </nav>
  </div>
</template>
