<script setup lang="ts">
withDefaults(defineProps<{ to?: string; admin?: boolean; light?: boolean }>(), { to: '/', admin: false, light: false })
</script>

<template>
  <NuxtLink :to="to" class="flex items-center gap-2 no-underline" :class="light ? 'text-white' : 'text-ink'" aria-label="Kusa home">
    <span class="flex size-[34px] items-center justify-center rounded-[11px] bg-palm text-white">
      <AppIcon name="pin" :size="19" />
    </span>
    <span class="font-display text-2xl font-extrabold tracking-tight">kusa</span>
    <span v-if="admin" class="rounded-md bg-white/12 px-1.5 py-0.5 text-[11px] font-bold">ADMIN</span>
  </NuxtLink>
</template>
