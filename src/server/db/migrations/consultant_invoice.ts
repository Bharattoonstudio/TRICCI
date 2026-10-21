/**
 * Migration: consultant_invoice. One invoice per placement. Draft until submitted.
 */
import { db } from '../client.js';

export async function migrateConsultantInvoice() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS consultant_invoice (
        id                    SERIAL PRIMARY KEY,
        placement_id          INTEGER NOT NULL UNIQUE REFERENCES placement(id) ON DELETE CASCADE,
        consultant_user_id    VARCHAR(36) NOT NULL,
        status                VARCHAR(16) NOT NULL DEFAULT 'draft',
        gst_enabled           BOOLEAN NOT NULL DEFAULT FALSE,
        gst_rate_pct          DOUBLE PRECISION NOT NULL DEFAULT 18,
        offer_ctc_lpa         DOUBLE PRECISION NOT NULL,
        fee_amount_lpa        DOUBLE PRECISION NOT NULL,
        platform_amount_lpa   DOUBLE PRECISION NOT NULL,
        consultant_amount_lpa DOUBLE PRECISION NOT NULL,
        gst_amount_lpa        DOUBLE PRECISION NOT NULL,
        total_amount_lpa      DOUBLE PRECISION NOT NULL,
        invoice_number        VARCHAR(64),
        submitted_at          TIMESTAMP,
        created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_consultant_invoice_consultant ON consultant_invoice(consultant_user_id)`);
    console.log('[migration] consultant_invoice: ok');
  } catch (err) {
    console.error('[migration] consultant_invoice failed:', err);
  }
}
