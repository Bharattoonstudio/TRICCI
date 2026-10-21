/**
 * Migration: remove the legacy platform_fee_pct (2%) setting from commission_config.
 * The platform's share is now a fixed 20% of the placement fee (see employerFee.ts).
 */
import { db } from '../client.js';

export async function migrateDropPlatformFeePct() {
  try {
    await db.execute(`ALTER TABLE commission_config DROP COLUMN IF EXISTS platform_fee_pct`);
    await db.execute(`ALTER TABLE placement ALTER COLUMN platform_fee_percent DROP DEFAULT`);
    console.log('[migration] drop_platform_fee_pct: ok');
  } catch (err) {
    console.error('[migration] drop_platform_fee_pct failed:', err);
  }
}
