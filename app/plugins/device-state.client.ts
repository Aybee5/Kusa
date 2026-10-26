// Restore what's kept on the device (signed-in user, saved businesses,
// chosen location). Done after the first render so server-rendered pages
// hydrate without mismatches; anything that depends on it updates after.
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('app:mounted', async () => {
    await Promise.all([useSession().load(), useSaved().load(), useLocation().load()])
  })
})
