/**
 * Migration: create commission_config table
 * Run once at startup via runMigrations()
 */
import { db } from '../client.js';
import { sql } from 'drizzle-orm';

export async function migrateCommissionConfig() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS commission_config (
        id INT PRIMARY KEY AUTO_INCREMENT,
        min_fee_percent FLOAT NOT NULL DEFAULT 5,
        max_fee_percent FLOAT NOT NULL DEFAULT 15,
        default_fee_percent FLOAT NOT NULL DEFAULT 8,
        platform_fee_pct FLOAT NOT NULL DEFAULT 2,
        payout_days INT NOT NULL DEFAULT 3,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    // Seed default row if empty
    const rows = await db.execute(sql`SELECT id FROM commission_config LIMIT 1`);
    const arr = rows as unknown as unknown[];
    if (!arr || (Array.isArray(arr[0]) && (arr[0] as unknown[]).length === 0)) {
      await db.execute(sql`
        INSERT INTO commission_config (min_fee_percent, max_fee_percent, default_fee_percent, platform_fee_pct, payout_days)
        VALUES (5, 15, 8, 2, 3)
      `);
    }
    console.log('[migration] commission_config: OK');
  } catch (err) {
    console.error('[migration] commission_config: FAILED', err);
  }
}
