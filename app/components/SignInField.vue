<script setup lang="ts">
import type { SignInMethod } from '#shared/types/api'
// Email or phone input for signing in.
defineProps<{ method: SignInMethod; id?: string }>()
const email = defineModel<string>('email', { required: true })
const phone = defineModel<string>('phone', { required: true })
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <template v-if="method === 'email'">
      <label :for="id ?? 'signin-email'" class="label">Email address</label>
      <input :id="id ?? 'signin-email'" v-model="email" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" placeholder="you@example.com" class="field h-[52px]" />
    </template>
    <template v-else>
      <label :for="id ?? 'signin-phone'" class="label">Phone number</label>
      <div class="flex h-[52px] items-center overflow-hidden rounded-2xl border-[1.5px] border-line bg-surface focus-within:border-palm">
        <span class="pl-3.5 pr-1.5 text-base font-semibold text-muted">+234</span>
        <input :id="id ?? 'signin-phone'" v-model="phone" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="803 000 0000" class="h-12 min-w-0 flex-1 bg-transparent text-base outline-none" />
      </div>
    </template>
  </div>
</template>
