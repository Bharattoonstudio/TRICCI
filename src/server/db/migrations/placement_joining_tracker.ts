/**
 * Migration: Joining Tracker fields on placement — background
 * verification status, documents checklist, induction completion, and
 * actual joining confirmation. Bridges the gap between "offer accepted"
 * (already tracked) and "payment due" (already tracked) — this fills in
 * what happens in between.
 */
import { db } from '../client.js';
import { sql } from 'drizzle-orm';

export async function migratePlacementJoiningTracker() {
  const stmts = [
    `ALTER TABLE placement ADD COLUMN bgv_status VARCHAR(16) DEFAULT 'pending'`,
    `ALTER TABLE placement ADD COLUMN bgv_note TEXT`,
    `ALTER TABLE placement ADD COLUMN documents_checklist JSONB DEFAULT '[{"label":"Offer Letter (Signed)","received":false},{"label":"Previous Employment Proof","received":false},{"label":"Educational Certificates","received":false},{"label":"ID Proof","received":false},{"label":"Address Proof","received":false}]'`,
    `ALTER TABLE placement ADD COLUMN induction_completed BOOLEAN NOT NULL DEFAULT false`,
    `ALTER TABLE placement ADD COLUMN actual_joining_confirmed BOOLEAN NOT NULL DEFAULT false`,
    `ALTER TABLE placement ADD COLUMN joining_note TEXT`,
  ];
  for (const stmt of stmts) {
    try {
      await db.execute(sql.raw(stmt));
    } catch {
      // column already exists — safe to ignore
    }
  }
  console.log('[migration] placement_joining_tracker: done');
}
