/**
 * Drizzle Kit configuration for PostgreSQL database migrations
 *
 * Usage:
 * - Generate migrations: npx drizzle-kit generate
 * - Push schema to database: npx drizzle-kit push
 *
 * Reads DATABASE_URL from environment variables:
 * - Set DATABASE_URL in .env or via hosting platform (Railway, Supabase, etc.)
 * - Format: postgresql://user:password@host:5432/dbname
 */
import { defineConfig } from 'drizzle-kit';
import { getDatabaseUrl } from './src/server/db/config';

const databaseUrl = getDatabaseUrl();

export default defineConfig({
  schema: './src/server/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
  verbose: true,
  strict: false,
});
