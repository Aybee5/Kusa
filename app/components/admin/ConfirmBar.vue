<script setup lang="ts">
const props = defineProps<{ title: string; body: string; reasons: string[]; confirmLabel: string }>()
const emit = defineEmits<{ confirm: [reason: string]; cancel: [] }>()
const reason = ref(props.reasons[0] ?? '')
const id = useId()
</script>

<template>
  <div class="flex flex-wrap items-center gap-3 rounded-2xl border-[1.5px] border-danger bg-surface px-[18px] py-4" role="alertdialog" :aria-labelledby="`${id}-t`">
    <div class="flex min-w-[240px] flex-1 flex-col gap-0.5">
      <strong :id="`${id}-t`" class="text-[15px]">{{ title }}</strong>
      <span class="text-[13px] text-muted">{{ body }}</span>
    </div>
    <label :for="`${id}-r`" class="sr-only">Reason</label>
    <select :id="`${id}-r`" v-model="reason" class="h-11 rounded-[10px] border-[1.5px] border-line bg-surface px-2.5 text-sm">
      <option v-for="r in reasons" :key="r">{{ r }}</option>
    </select>
    <button type="button" class="h-11 cursor-pointer rounded-[10px] border-[1.5px] border-ink bg-surface px-4 text-sm font-bold" @click="emit('cancel')">Cancel</button>
    <button type="button" class="h-11 cursor-pointer rounded-[10px] bg-danger px-4 text-sm font-bold text-white" @click="emit('confirm', reason)">{{ confirmLabel }}</button>
  </div>
</template>
