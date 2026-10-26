/** True on laptop-sized screens (Tailwind `lg`, 1024px and up). Client only. */
export function useIsDesktop() {
  const isDesktop = useState('kusa-is-desktop', () => false)
  onMounted(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const update = () => (isDesktop.value = mq.matches)
    update()
    mq.addEventListener('change', update)
    onBeforeUnmount(() => mq.removeEventListener('change', update))
  })
  return isDesktop
}
