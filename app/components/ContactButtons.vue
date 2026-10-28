<script setup lang="ts">
import type { ContactChannel, Vendor } from '#shared/types'

// How shoppers reach a vendor: the vendor's main channel first and
// highlighted, then their other channels. "profile" adds a Map button.
const props = withDefaults(defineProps<{
  vendor: Pick<Vendor, 'id' | 'name' | 'phone' | 'whatsapp' | 'instagram' | 'showPhone' | 'primaryContact' | 'lat' | 'lng'>
  productName?: string
  variant?: 'profile' | 'product' | 'bar'
  /** Shop-settings preview: draw the buttons without links. */
  preview?: boolean
}>(), { variant: 'profile' })

const { whatsappUrl, instagramUrl, callUrl, directionsUrl, track, copyMessage } = useContact()

interface Channel { kind: ContactChannel; label: string; short: string; icon: string; href: string; external: boolean }
const channels = computed<Channel[]>(() => {
  const v = props.vendor
  const order = props.productName ? 'Order on ' : ''
  const list: Channel[] = []
  if (v.whatsapp) list.push({ kind: 'whatsapp', label: `${order}WhatsApp`, short: 'WhatsApp', icon: 'chat', href: whatsappUrl(v, props.productName), external: true })
  if (v.instagram) list.push({ kind: 'instagram', label: `${order}Instagram`, short: 'Instagram', icon: 'instagram', href: instagramUrl(v), external: true })
  if (v.showPhone) list.push({ kind: 'phone', label: 'Call', short: 'Call', icon: 'phone', href: callUrl(v), external: false })
  return list.sort((a, b) => Number(b.kind === v.primaryContact) - Number(a.kind === v.primaryContact))
})
const primary = computed(() => channels.value[0])
const others = computed(() => channels.value.slice(1))

function tapped(c: Channel) {
  if (props.preview) return
  track(props.vendor, c.kind === 'phone' ? 'call' : c.kind)
  if (c.kind === 'instagram' && props.productName) copyMessage(props.vendor, props.productName)
}
const tag = computed(() => (props.preview ? 'span' : 'a'))
const linkAttrs = (c: Channel) => (props.preview ? {} : { href: c.href, ...(c.external ? { target: '_blank', rel: 'noopener' } : {}) })
const mapCols = computed(() => others.value.length + (props.variant === 'profile' ? 1 : 0))
</script>

<template>
  <!-- Vendor page: main button wide, the rest as small stacked buttons -->
  <div v-if="variant === 'profile'" class="grid gap-2" :style="{ gridTemplateColumns: `minmax(0,2fr) repeat(${mapCols}, minmax(0,1fr))` }">
    <component :is="tag" v-if="primary" v-bind="linkAttrs(primary)" class="btn-primary h-[50px] px-3" @click="tapped(primary)">
      <AppIcon :name="primary.icon" /><span class="truncate">{{ primary.short }}</span>
    </component>
    <component :is="tag" v-for="c in others" :key="c.kind" v-bind="linkAttrs(c)" class="btn-outline h-[50px] flex-col gap-0 px-1 text-xs" @click="tapped(c)">
      <AppIcon :name="c.icon" :size="18" />{{ c.short }}
    </component>
    <component :is="tag" v-bind="preview ? {} : { href: directionsUrl(vendor), target: '_blank', rel: 'noopener' }" class="btn-outline h-[50px] flex-col gap-0 px-1 text-xs" @click="!preview && track(vendor, 'directions')">
      <AppIcon name="navigate" :size="18" />Map
    </component>
  </div>

  <!-- Product page on a laptop -->
  <div v-else-if="variant === 'product'" class="flex gap-2.5">
    <component :is="tag" v-if="primary" v-bind="linkAttrs(primary)" class="btn-primary h-[54px] flex-1 text-base" @click="tapped(primary)">
      <AppIcon :name="primary.icon" />{{ primary.label }}
    </component>
    <component :is="tag" v-for="c in others" :key="c.kind" v-bind="linkAttrs(c)" class="btn-outline h-[54px] px-5" @click="tapped(c)">
      <AppIcon :name="c.icon" />{{ c.short }}
    </component>
    <slot />
  </div>

  <!-- Product page bar on a phone: others as square icon buttons -->
  <div v-else class="flex gap-2.5">
    <component
      :is="tag"
      v-for="c in others"
      :key="c.kind"
      v-bind="linkAttrs(c)"
      :aria-label="c.kind === 'phone' ? 'Call vendor' : `Message on ${c.short}`"
      class="flex size-[54px] shrink-0 items-center justify-center rounded-2xl border-[1.5px] border-ink text-ink"
      @click="tapped(c)"
    >
      <AppIcon :name="c.icon" :size="22" />
    </component>
    <component :is="tag" v-if="primary" v-bind="linkAttrs(primary)" class="btn-primary h-[54px] flex-1 text-base" @click="tapped(primary)">
      <AppIcon :name="primary.icon" />{{ primary.label }}
    </component>
  </div>
</template>
