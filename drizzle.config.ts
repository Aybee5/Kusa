import { defineConfig } from 'drizzle-kit'

// `npm run db:generate` turns changes in schema.ts into a new SQL migration.
// Migrations run automatically when the server starts (server/plugins/database.ts).
export default defineConfig({
  dialect: 'postgresql',
  schema: './server/database/schema.ts',
  out: './server/database/migrations',
  dbCredentials: { url: process.env.DATABASE_URL ?? 'postgres://kusa:kusa@localhost:5432/kusa' },
})
