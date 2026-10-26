<script setup lang="ts">
const { message } = useToast()
</script>

<template>
  <div class="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 lg:bottom-8" aria-live="polite">
    <Transition
      enter-active-class="transition duration-200"
      enter-from-class="opacity-0 translate-y-2"
      leave-active-class="transition duration-150"
      leave-to-class="opacity-0"
    >
      <div v-if="message" class="pointer-events-auto rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white shadow-lg">
        {{ message }}
      </div>
    </Transition>
  </div>
</template>
