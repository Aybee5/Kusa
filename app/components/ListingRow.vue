<script setup lang="ts">
import type { Product } from '#shared/types'
defineProps<{ product: Product }>()
defineEmits<{ toggle: [id: string, available: boolean] }>()
</script>

<template>
  <div class="flex items-center gap-3 border-b border-line py-2.5">
    <PhotoBox :tint="product.tint" :src="product.image" class="size-[54px] shrink-0 rounded-xl" />
    <div class="flex min-w-0 flex-1 flex-col gap-0.5">
      <span class="truncate text-sm font-bold">{{ product.name }}</span>
      <span class="text-[13px] text-muted">
        {{ product.options?.length ? `from ${formatNaira(Math.min(...product.options.map((o) => o.price)))}` : formatNaira(product.price) }} ·
        <span class="font-semibold" :class="product.available ? 'text-palm' : 'text-amber-ink'">{{ product.available ? 'Available' : 'Sold out' }}</span>
      </span>
    </div>
    <button
      type="button"
      role="switch"
      :aria-checked="product.available"
      :aria-label="`Available: ${product.name}`"
      class="flex h-11 w-[52px] shrink-0 cursor-pointer items-center justify-center"
      @click="$emit('toggle', product.id, !product.available)"
    >
      <span class="flex h-7 w-[46px] items-center rounded-full p-[3px] transition-colors" :class="product.available ? 'justify-end bg-palm' : 'justify-start bg-[#C9C2B3]'">
        <span class="size-[22px] rounded-full bg-white shadow" />
      </span>
    </button>
  </div>
</template>
