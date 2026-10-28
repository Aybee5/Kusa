// npm run db:migrate | db:seed | db:reset
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import * as schema from './schema'
import { runMigrations } from './migrate'
import { seedDemoData } from './seed'

const here = dirname(fileURLToPath(import.meta.url))
const migrationsDir = join(here, 'migrations')
const command = process.argv[2]
const url = process.env.DATABASE_URL
if (!url) {
  console.error('Set DATABASE_URL first (see .env.example).')
  process.exit(1)
}

const pool = new pg.Pool({ connectionString: url })
const migrate = async () => {
  const journal = JSON.parse(await readFile(join(migrationsDir, 'meta/_journal.json'), 'utf8'))
  await runMigrations(pool, journal, (tag) => readFile(join(migrationsDir, `${tag}.sql`), 'utf8'))
}

try {
  if (command === 'reset') {
    await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;')
    console.log('[db] dropped all tables')
  }
  if (command === 'migrate' || command === 'seed' || command === 'reset') await migrate()
  if (command === 'seed' || command === 'reset') {
    const loaded = await seedDemoData(drizzle(pool, { schema }))
    if (!loaded) console.log('[db] database already has data; seed skipped (use db:reset to start over)')
  }
  if (!['migrate', 'seed', 'reset'].includes(command ?? '')) console.log('Usage: tsx server/database/cli.ts migrate|seed|reset')
} finally {
  await pool.end()
}
