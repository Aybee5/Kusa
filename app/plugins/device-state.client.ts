// Restore what's kept on the device (signed-in user, saved businesses,
// chosen location) once the page has finished hydrating, so server-rendered
// pages hydrate cleanly and searches re-run for the saved location.
export default defineNuxtPlugin(() => {
  onNuxtReady(async () => {
    await Promise.all([useSession().load(), useSaved().load(), useLocation().load()])
  })
})
