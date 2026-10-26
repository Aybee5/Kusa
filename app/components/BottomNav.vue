<script setup lang="ts">
const route = useRoute()
const items = [
  { to: '/', label: 'Discover', icon: 'compass', match: (p: string) => p === '/' },
  { to: '/search', label: 'Nearby', icon: 'map', match: (p: string) => p.startsWith('/search') },
  { to: '/saved', label: 'Saved', icon: 'heart', match: (p: string) => p.startsWith('/saved') },
  { to: '/account', label: 'Account', icon: 'user', match: (p: string) => p.startsWith('/account') || p.startsWith('/signin') },
]
</script>

<template>
  <nav aria-label="Main" class="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface lg:hidden">
    <div class="grid h-[64px] grid-cols-4 px-2">
      <NuxtLink
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        :aria-current="item.match(route.path) ? 'page' : undefined"
        class="flex flex-col items-center justify-center gap-0.5 text-[11px]"
        :class="item.match(route.path) ? 'font-bold text-palm' : 'font-semibold text-muted'"
      >
        <AppIcon :name="item.icon" :size="24" />
        {{ item.label }}
      </NuxtLink>
    </div>
  </nav>
</template>
