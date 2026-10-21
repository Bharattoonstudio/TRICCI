/**
 * Migration: admin review columns on consultant_invoice (approve, send back, send to employer).
 */
import { db } from '../client.js';

export async function migrateConsultantInvoiceReview() {
  try {
    await db.execute(`ALTER TABLE consultant_invoice ADD COLUMN IF NOT EXISTS admin_remarks TEXT`);
    await db.execute(`ALTER TABLE consultant_invoice ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP`);
    await db.execute(`ALTER TABLE consultant_invoice ADD COLUMN IF NOT EXISTS reviewed_by_user_id VARCHAR(36)`);
    await db.execute(`ALTER TABLE consultant_invoice ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP`);
    await db.execute(`ALTER TABLE consultant_invoice ADD COLUMN IF NOT EXISTS sent_to_employer_at TIMESTAMP`);
    console.log('[migration] consultant_invoice_review: ok');
  } catch (err) {
    console.error('[migration] consultant_invoice_review failed:', err);
  }
}
