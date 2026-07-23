/**
 * Database connection setup using Drizzle ORM with node-postgres (pg)
 *
 * Connects to Supabase Postgres via the Session Pooler connection string
 * (DATABASE_URL). SSL is required by Supabase.
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { getDatabaseUrl } from './config';
import * as schema from './schema';

// Create Postgres connection pool
const pool = new Pool({
  connectionString: getDatabaseUrl(),
  ssl: {
    rejectUnauthorized: false,
  },
  max: 10, // connection pool size — mirrors the previous MySQL pool's connectionLimit
});

// Create Drizzle instance
export const db = drizzle(pool, { schema });

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch {
    return false;
  }
}

/**
 * Close database connection pool
 */
export async function closeConnection(): Promise<void> {
  await pool.end();
}
