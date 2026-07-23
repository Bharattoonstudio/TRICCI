/**
 * Raw mysql2 pool for parameterized queries that bypass Drizzle ORM.
 * Use this when you need `pool.query(sql, [params])` directly.
 *
 * Shares the same credentials as the Drizzle client but creates its own
 * pool instance — this is intentional so client.ts stays immutable.
 */
import mysql from 'mysql2/promise';
import { getDatabaseCredentials } from './config.js';

const dbConfig = getDatabaseCredentials();

export const pool = mysql.createPool({
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.database,
  ssl: { rejectUnauthorized: false },
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
});
