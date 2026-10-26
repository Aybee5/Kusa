<script setup lang="ts">
const route = useRoute()
const { user } = useRequireRole('admin')
const signOut = useSignOut()
const api = useApi()
const { data: counts } = await useAsyncData('admin-counts', async () => {
  const [vendors, reviews] = await Promise.all([api.adminVendors(), api.adminReviews()])
  return {
    pending: vendors.filter((v) => v.status === 'pending').length,
    flagged: reviews.filter((r) => r.status === 'flagged').length,
  }
})

const items = computed(() => [
  { to: '/admin/vendors', label: 'Vendors', icon: 'store', badge: counts.value?.pending },
  { to: '/admin/reviews', label: 'Reviews', icon: 'star', badge: counts.value?.flagged },
  { to: '/admin/shoppers', label: 'Shoppers', icon: 'users', badge: 0 },
])
const isActive = (to: string) => route.path.startsWith(to)
</script>

<template>
  <div class="min-h-dvh bg-admin lg:flex">
    <aside class="hidden w-[248px] shrink-0 flex-col gap-6 bg-ink px-4 py-6 text-white lg:flex">
      <div class="px-2"><BrandMark to="/admin/vendors" admin light /></div>
      <nav aria-label="Admin" class="flex flex-col gap-0.5">
        <NuxtLink
          v-for="item in items"
          :key="item.to"
          :to="item.to"
          :aria-current="isActive(item.to) ? 'page' : undefined"
          class="flex min-h-[42px] items-center gap-2.5 rounded-[10px] px-2.5 text-sm"
          :class="isActive(item.to) ? 'bg-white/10 font-bold text-white' : 'font-semibold text-[#C9D1CC] hover:bg-white/5'"
        >
          <AppIcon :name="item.icon" :size="18" />
          <span class="flex-1">{{ item.label }}</span>
          <span v-if="item.badge" class="flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-saffron px-1.5 text-xs font-bold text-ink">{{ item.badge }}</span>
        </NuxtLink>
      </nav>
      <div class="mt-auto flex flex-col gap-3 border-t border-white/10 pt-4 text-xs text-[#C9D1CC]">
        <NuxtLink to="/" class="flex min-h-[42px] items-center gap-2.5 rounded-[10px] px-2.5 text-sm font-semibold text-[#C9D1CC] hover:bg-white/5"><AppIcon name="compass" :size="18" />Open Kusa</NuxtLink>
        <button type="button" class="flex min-h-[42px] cursor-pointer items-center gap-2.5 rounded-[10px] px-2.5 text-left text-sm font-semibold text-[#C9D1CC] hover:bg-white/5" @click="signOut('/')">
          <AppIcon name="logout" :size="18" />Sign out<span v-if="user" class="truncate font-normal opacity-70">· {{ user.name || maskPhone(user.phone) }}</span>
        </button>
      </div>
    </aside>

    <!-- Phone and tablet top bar -->
    <header class="pt-safe sticky top-0 z-30 bg-ink text-white lg:hidden">
      <div class="flex items-center justify-between px-4 py-3">
        <BrandMark to="/admin/vendors" admin light />
        <NuxtLink to="/" class="text-sm font-semibold text-[#C9D1CC]">Open Kusa</NuxtLink>
      </div>
      <nav aria-label="Admin" class="no-scrollbar flex gap-1.5 overflow-x-auto px-4 pb-3">
        <NuxtLink
          v-for="item in items"
          :key="item.to"
          :to="item.to"
          :aria-current="isActive(item.to) ? 'page' : undefined"
          class="flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-bold"
          :class="isActive(item.to) ? 'bg-white text-ink' : 'bg-white/10 text-white'"
        >
          {{ item.label }}
          <span v-if="item.badge" class="flex h-5 min-w-5 items-center justify-center rounded-full bg-saffron px-1 text-[11px] text-ink">{{ item.badge }}</span>
        </NuxtLink>
      </nav>
    </header>

    <main class="min-w-0 flex-1 px-4 pb-12 pt-6 lg:px-10 lg:pt-8">
      <div class="mx-auto flex max-w-[1180px] flex-col gap-6">
        <slot />
      </div>
    </main>
  </div>
</template>
