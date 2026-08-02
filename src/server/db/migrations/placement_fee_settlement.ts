/**
 * Migration: fee split + acceptance + settlement tracking on placement
 * (points 48-55 — consultant fee accept/reject, payment term, remuneration
 * paid tracking, consultant acknowledgment).
 */
import { db } from '../client.js';
import { sql } from 'drizzle-orm';

export async function migratePlacementFeeSettlement() {
  const stmts = [
    `ALTER TABLE placement ADD COLUMN platform_fee_percent DOUBLE PRECISION DEFAULT 2`,
    `ALTER TABLE placement ADD COLUMN consultant_fee_percent DOUBLE PRECISION`,
    `ALTER TABLE placement ADD COLUMN consultant_fee_amount_lpa DOUBLE PRECISION`,
    `ALTER TABLE placement ADD COLUMN fee_acceptance_status VARCHAR(16) NOT NULL DEFAULT 'pending'`,
    `ALTER TABLE placement ADD COLUMN fee_responded_at TIMESTAMP`,
    `ALTER TABLE placement ADD COLUMN payment_term_days INTEGER NOT NULL DEFAULT 45`,
    `ALTER TABLE placement ADD COLUMN consultant_acknowledged_at TIMESTAMP`,
    `ALTER TABLE job ADD COLUMN payment_term_days INTEGER NOT NULL DEFAULT 45`,
    // Backfill consultant fee fields for any placements that predate this migration
    `UPDATE placement SET consultant_fee_percent = GREATEST(fee_percent - COALESCE(platform_fee_percent, 2), 0) WHERE consultant_fee_percent IS NULL AND fee_percent IS NOT NULL`,
    `UPDATE placement SET consultant_fee_amount_lpa = consultant_fee_percent / 100.0 * ctc_lpa WHERE consultant_fee_amount_lpa IS NULL AND consultant_fee_percent IS NOT NULL AND ctc_lpa IS NOT NULL`,
  ];
  for (const stmt of stmts) {
    try {
      await db.execute(sql.raw(stmt));
    } catch (err) {
      const msg = String((err as Error)?.message || '');
      if (!msg.includes('already exists') && !msg.includes('duplicate column')) {
        console.error('[migration] placement_fee_settlement: unexpected error:', stmt, err);
      }
    }
  }
  console.log('[migration] placement_fee_settlement: done');
}
