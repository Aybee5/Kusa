<!-- Focused flows (sign in, rate, register): full screen on phones, a centred card on laptops. -->
<template>
  <div class="min-h-dvh lg:bg-admin">
    <header class="hidden border-b border-line bg-surface lg:block">
      <div class="mx-auto flex max-w-[1240px] items-center px-6 py-3.5">
        <BrandMark />
      </div>
    </header>
    <div class="pt-safe mx-auto max-w-[560px] lg:my-10 lg:overflow-hidden lg:rounded-3xl lg:border lg:border-line lg:bg-paper">
      <slot />
    </div>
  </div>
</template>
