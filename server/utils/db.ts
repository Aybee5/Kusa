import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import * as schema from '../database/schema'

export { schema }
export type Db = NodePgDatabase<typeof schema>

let pool: pg.Pool | undefined
let db: Db | undefined

export function usePool(): pg.Pool {
  if (!pool) {
    const url = serverConfig().databaseUrl
    if (!url) throw new Error('DATABASE_URL is not set. See .env.example.')
    pool = new pg.Pool({
      connectionString: url,
      // Add ?sslmode=require to the URL for hosted databases (Neon, Supabase, RDS…).
      max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    })
  }
  return pool
}

export function useDb(): Db {
  if (!db) db = drizzle(usePool(), { schema })
  return db
}
