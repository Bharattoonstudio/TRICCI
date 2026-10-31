/**
 * Migration: widen consultant_invoice.status to 32 characters.
 * 'employer_approved' is 17 characters and did not fit the original varchar(16).
 */
import { db } from '../client.js';

export async function migrateInvoiceStatusLength() {
  try {
    await db.execute(`ALTER TABLE consultant_invoice ALTER COLUMN status TYPE VARCHAR(32)`);
    console.log('[migration] invoice_status_length: ok');
  } catch (err) {
    console.error('[migration] invoice_status_length failed:', err);
  }
}
