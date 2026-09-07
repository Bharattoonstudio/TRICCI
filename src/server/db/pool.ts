/**
 * Raw Postgres pool for parameterized queries that bypass Drizzle ORM.
 * Use this when you need `pool.query(sql, [params])` directly.
 *
 * Shares the same DATABASE_URL as the Drizzle client but creates its own
 * pool instance — this is intentional so client.ts stays immutable.
 *
 * Note: Postgres uses $1, $2, ... placeholders, NOT MySQL's `?` style.
 */
import { Pool } from 'pg';
import { getDatabaseUrl } from './config.js';

export const pool = new Pool({
  connectionString: getDatabaseUrl(),
  ssl: { rejectUnauthorized: false },
  max: 5,
});
