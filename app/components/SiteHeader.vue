<script setup lang="ts">
const route = useRoute()
const { user } = useSession()
const q = ref(typeof route.query.q === 'string' ? route.query.q : '')
watch(() => route.query.q, (v) => (q.value = typeof v === 'string' ? v : ''))

function submit() {
  navigateTo({ path: '/search', query: { ...(q.value ? { q: q.value } : {}) } })
}
</script>

<template>
  <header class="hidden border-b border-line bg-surface lg:block">
    <div class="mx-auto flex max-w-[1240px] items-center gap-6 px-6 py-3.5">
      <BrandMark />
      <LocationButton variant="pill" />
      <form class="flex h-12 flex-1 items-center gap-2.5 rounded-2xl border-[1.5px] border-line bg-surface pl-4 pr-1.5 focus-within:border-palm" role="search" @submit.prevent="submit">
        <AppIcon name="search" />
        <label for="site-q" class="sr-only">Search</label>
        <input id="site-q" v-model="q" type="search" placeholder="Search small chops, beads, cakes…" class="h-11 min-w-0 flex-1 bg-transparent text-base outline-none" />
        <button type="submit" class="h-[38px] cursor-pointer rounded-xl bg-ink px-4 text-sm font-bold text-white">Search</button>
      </form>
      <nav aria-label="Main" class="flex items-center gap-1">
        <NuxtLink to="/search" class="flex min-h-11 items-center gap-1.5 px-3 text-sm font-semibold text-ink"><AppIcon name="map" :size="18" />Map</NuxtLink>
        <NuxtLink to="/saved" class="flex min-h-11 items-center gap-1.5 px-3 text-sm font-semibold text-ink"><AppIcon name="heart" :size="18" />Saved</NuxtLink>
        <NuxtLink :to="user?.role === 'vendor' ? '/vendor' : '/vendor/signup'" class="ml-1.5 flex min-h-10 items-center rounded-full border-[1.5px] border-ink px-3.5 text-sm font-bold text-ink">
          {{ user?.role === 'vendor' ? 'My shop' : 'Sell on Kusa' }}
        </NuxtLink>
        <NuxtLink v-if="user" to="/account" class="flex min-h-10 items-center gap-2 rounded-full bg-palm-tint px-3.5 text-sm font-bold text-palm">
          <AppIcon name="user" :size="18" />{{ user.name.split(' ')[0] }}
        </NuxtLink>
        <NuxtLink v-else to="/signin" class="flex min-h-10 items-center rounded-full bg-palm px-4 text-sm font-bold text-white">Sign in</NuxtLink>
      </nav>
    </div>
  </header>
</template>
