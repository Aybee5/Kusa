import type { Pool } from 'pg'

interface Journal { entries: { idx: number; tag: string }[] }

/**
 * Applies the SQL migrations drizzle-kit generated, in order, each in its own
 * transaction. Applied tags are recorded in kusa_migrations. An advisory lock
 * stops two servers starting at once from racing.
 */
export async function runMigrations(pool: Pool, journal: Journal, readSql: (tag: string) => Promise<string>, log = console.log) {
  const client = await pool.connect()
  try {
    await client.query('SELECT pg_advisory_lock(727141)')
    await client.query('CREATE TABLE IF NOT EXISTS kusa_migrations (tag text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())')
    const done = new Set((await client.query<{ tag: string }>('SELECT tag FROM kusa_migrations')).rows.map((r) => r.tag))
    for (const entry of [...journal.entries].sort((a, b) => a.idx - b.idx)) {
      if (done.has(entry.tag)) continue
      const statements = (await readSql(entry.tag)).split('--> statement-breakpoint').map((s) => s.trim()).filter(Boolean)
      await client.query('BEGIN')
      try {
        for (const stmt of statements) await client.query(stmt)
        await client.query('INSERT INTO kusa_migrations (tag) VALUES ($1)', [entry.tag])
        await client.query('COMMIT')
        log(`[db] applied migration ${entry.tag}`)
      } catch (e) {
        await client.query('ROLLBACK')
        throw e
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock(727141)').catch(() => {})
    client.release()
  }
}
