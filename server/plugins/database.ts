import { runMigrations } from '../database/migrate'
import { seedDemoData } from '../database/seed'

// Apply pending migrations on start-up (bundled as server assets so this works
// after `nuxt build`), then load demo data into an empty database when
// SEED_DEMO_DATA is on (default in development).
export default defineNitroPlugin(() => {
  const cfg = serverConfig()
  if (process.env.KUSA_TARGET === 'app') return // static app build: no server
  if (!cfg.databaseUrl) {
    console.warn('[db] DATABASE_URL is not set. The API needs a Postgres database: see README.')
    return
  }
  const assets = useStorage('assets:migrations')
  const read = async (key: string) => {
    const raw = await assets.getItemRaw(key)
    if (raw == null) throw new Error(`Missing migration asset ${key}`)
    return typeof raw === 'string' ? raw : Buffer.from(raw as Uint8Array).toString('utf8')
  }
  addStartupTask(
    (async () => {
      const journal = JSON.parse(await read('meta/_journal.json'))
      await runMigrations(usePool(), journal, (tag) => read(`${tag}.sql`))
      await setupGeo(usePool(), cfg.geoSearch)
      if (cfg.seedDemoData) await seedDemoData(useDb())
    })().catch((e) => {
      console.error('[db] start-up failed:', e)
      throw e
    }),
  )
})
