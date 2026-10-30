/**
 * Migration: invoice_message. Thread of replies and employer queries on a consultant invoice.
 */
import { db } from '../client.js';

export async function migrateInvoiceMessage() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS invoice_message (
        id                SERIAL PRIMARY KEY,
        placement_id      INTEGER NOT NULL REFERENCES placement(id) ON DELETE CASCADE,
        author_user_id    VARCHAR(36) NOT NULL,
        author_role       VARCHAR(16) NOT NULL,
        kind              VARCHAR(16) NOT NULL DEFAULT 'reply',
        body              TEXT NOT NULL,
        created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_invoice_message_placement ON invoice_message(placement_id)`);
    console.log('[migration] invoice_message: ok');
  } catch (err) {
    console.error('[migration] invoice_message failed:', err);
  }
}
