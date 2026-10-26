<script setup lang="ts">
const route = useRoute()
const showBottomNav = computed(() => !route.meta.hideBottomNav)
</script>

<template>
  <div class="flex min-h-dvh flex-col">
    <SiteHeader />
    <main class="flex-1" :class="showBottomNav ? 'pb-[calc(64px+env(safe-area-inset-bottom))] lg:pb-0' : ''">
      <slot />
    </main>
    <SiteFooter />
    <BottomNav v-if="showBottomNav" />
  </div>
</template>
