<template>
  <footer class="hidden border-t border-line lg:block">
    <div class="mx-auto flex max-w-[1240px] flex-wrap justify-between gap-3 px-6 py-6 text-sm text-muted">
      <span>© {{ new Date().getFullYear() }} Kusa</span>
      <nav aria-label="Footer" class="flex flex-wrap gap-5">
        <NuxtLink to="/vendor/signup" class="text-muted hover:text-ink">Sell on Kusa</NuxtLink>
        <NuxtLink to="/admin" class="text-muted hover:text-ink">Admin</NuxtLink>
        <a href="#" class="text-muted hover:text-ink">Help</a>
        <a href="#" class="text-muted hover:text-ink">Terms</a>
        <a href="#" class="text-muted hover:text-ink">Privacy</a>
      </nav>
    </div>
  </footer>
</template>
