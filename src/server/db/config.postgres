/**
 * Database configuration loader
 *
 * Reads a standard Postgres connection string from the DATABASE_URL
 * environment variable (e.g. the Supabase Session Pooler URI).
 *
 * Set DATABASE_URL in your hosting platform's environment variables:
 *   postgresql://postgres.<project-ref>:<password>@<host>:5432/postgres
 */
import { env } from 'node:process';

/**
 * Returns the raw Postgres connection string.
 * Throws a clear error at startup if it hasn't been configured,
 * rather than failing confusingly deep inside the DB driver.
 */
export function getDatabaseUrl(): string {
  const url = env.DATABASE_URL;

  if (!url || typeof url !== 'string' || url.trim().length === 0) {
    throw new Error(
      'DATABASE_URL is not set. Add it to your environment variables ' +
      '(e.g. Railway → Variables) using the Supabase Session Pooler connection string.'
    );
  }

  return url;
}
