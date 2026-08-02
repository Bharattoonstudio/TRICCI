/**
 * Migration: create commission_config table
 * Run once at startup via runMigrations()
 *
 * FIX: was written in MySQL syntax (AUTO_INCREMENT, ON UPDATE
 * CURRENT_TIMESTAMP) against a Postgres pool — the CREATE TABLE could
 * never have actually succeeded, which also meant the default-row seeding
 * logic below it never ran either (same try block). The real table exists
 * via Drizzle's schema push, but if it was never seeded, code reading
 * commission_config may have been working off an empty table this whole
 * time. Rewritten with valid Postgres syntax and correct result handling
 * (node-postgres returns { rows: [...] }, not a MySQL-style tuple).
 */
import { db } from '../client.js';
import { sql } from 'drizzle-orm';

export async function migrateCommissionConfig() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS commission_config (
        id SERIAL PRIMARY KEY,
        min_fee_percent DOUBLE PRECISION NOT NULL DEFAULT 5,
        max_fee_percent DOUBLE PRECISION NOT NULL DEFAULT 15,
        default_fee_percent DOUBLE PRECISION NOT NULL DEFAULT 8,
        platform_fee_pct DOUBLE PRECISION NOT NULL DEFAULT 2,
        payout_days INTEGER NOT NULL DEFAULT 3,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed default row if empty
    const result = await db.execute(sql`SELECT id FROM commission_config LIMIT 1`);
    const rows = (result as unknown as { rows?: unknown[] }).rows ?? (result as unknown as unknown[]);
    if (!rows || rows.length === 0) {
      await db.execute(sql`
        INSERT INTO commission_config (min_fee_percent, max_fee_percent, default_fee_percent, platform_fee_pct, payout_days)
        VALUES (5, 15, 8, 2, 3)
      `);
      console.log('[migration] commission_config: seeded default row');
    }
    console.log('[migration] commission_config: OK');
  } catch (err) {
    console.error('[migration] commission_config: FAILED', err);
  }
}
