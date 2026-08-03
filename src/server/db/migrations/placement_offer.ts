/**
 * Migration: offer management fields on placement table — offer status,
 * offered CTC, sent/expiry/response dates, and joining date (bridges the
 * Selected → Offer → Joined pipeline stages).
 */
import { db } from '../client.js';
import { sql } from 'drizzle-orm';

export async function migratePlacementOffer() {
  const stmts = [
    `ALTER TABLE placement ADD COLUMN offer_status VARCHAR(16) NOT NULL DEFAULT 'not_sent'`,
    `ALTER TABLE placement ADD COLUMN offer_ctc_lpa DOUBLE PRECISION`,
    `ALTER TABLE placement ADD COLUMN offer_sent_at TIMESTAMP`,
    `ALTER TABLE placement ADD COLUMN offer_expiry_date TIMESTAMP`,
    `ALTER TABLE placement ADD COLUMN offer_responded_at TIMESTAMP`,
    `ALTER TABLE placement ADD COLUMN offer_note TEXT`,
    `ALTER TABLE placement ADD COLUMN joining_date TIMESTAMP`,
  ];
  for (const stmt of stmts) {
    try {
      await db.execute(sql.raw(stmt));
    } catch {
      // column already exists — safe to ignore
    }
  }
  console.log('[migration] placement_offer: done');
}
