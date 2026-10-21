/**
 * Migration: invoice_payment. One row per Razorpay order for a consultant invoice.
 * Stores the amount and the split in paise, fixed at order time.
 */
import { db } from '../client.js';

export async function migrateInvoicePayment() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS invoice_payment (
        id                    SERIAL PRIMARY KEY,
        placement_id          INTEGER NOT NULL REFERENCES placement(id) ON DELETE CASCADE,
        razorpay_order_id     VARCHAR(128) NOT NULL UNIQUE,
        razorpay_payment_id   VARCHAR(128),
        amount_paise          INTEGER NOT NULL,
        fee_paise             INTEGER NOT NULL,
        platform_paise        INTEGER NOT NULL,
        consultant_paise      INTEGER NOT NULL,
        gst_paise             INTEGER NOT NULL,
        status                VARCHAR(16) NOT NULL DEFAULT 'created',
        created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        paid_at               TIMESTAMP
      )
    `);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_invoice_payment_placement ON invoice_payment(placement_id)`);
    console.log('[migration] invoice_payment: ok');
  } catch (err) {
    console.error('[migration] invoice_payment failed:', err);
  }
}
