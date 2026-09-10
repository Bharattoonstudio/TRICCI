/**
 * Migration: adds the internal offer-approval workflow columns to
 * placement -- a recruiter drafts an offer, a team lead/owner approves
 * it (which actually sends it), plus a separate verification status.
 * Null approval status means the offer was sent directly via the
 * existing simple OfferModal flow, no approval step involved.
 */
import { db } from '../client.js';
import { sql } from 'drizzle-orm';

export async function migrateOfferApprovalWorkflow() {
  try {
    await db.execute(sql`ALTER TABLE placement ADD COLUMN IF NOT EXISTS offer_approval_status VARCHAR(24)`);
    await db.execute(sql`ALTER TABLE placement ADD COLUMN IF NOT EXISTS offer_approval_requested_by VARCHAR(36)`);
    await db.execute(sql`ALTER TABLE placement ADD COLUMN IF NOT EXISTS offer_approved_by VARCHAR(36)`);
    await db.execute(sql`ALTER TABLE placement ADD COLUMN IF NOT EXISTS offer_approval_note TEXT`);
    await db.execute(sql`ALTER TABLE placement ADD COLUMN IF NOT EXISTS offer_verification_status VARCHAR(24)`);
    console.log('[migration] offer_approval_workflow: done');
  } catch (err) {
    console.error('[migration] offer_approval_workflow: FAILED', err);
  }
}
