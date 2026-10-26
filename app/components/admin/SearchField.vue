<script setup lang="ts">
defineProps<{ placeholder: string; label: string }>()
const model = defineModel<string>({ required: true })
const id = useId()
</script>

<template>
  <div class="flex h-11 w-full items-center gap-2 rounded-xl border-[1.5px] border-line bg-surface px-3 focus-within:border-palm sm:w-[340px]">
    <AppIcon name="search" :size="18" class="text-muted" />
    <label :for="id" class="sr-only">{{ label }}</label>
    <input :id="id" v-model="model" type="search" :placeholder="placeholder" class="h-10 min-w-0 flex-1 bg-transparent text-[15px] outline-none" />
  </div>
</template>
