export function useToast() {
  const message = useState<string | null>('kusa-toast', () => null)
  let timer: ReturnType<typeof setTimeout> | undefined

  function show(text: string) {
    message.value = text
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => (message.value = null), 3200)
  }

  return { message, show }
}
