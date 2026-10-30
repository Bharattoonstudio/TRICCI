/**
 * Migration: consultant_transfer. Log of manual payouts TRICCI makes to a consultant
 * after an employer payment. Records only; no money moves from this table.
 */
import { db } from '../client.js';

export async function migrateConsultantTransfer() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS consultant_transfer (
        id                    SERIAL PRIMARY KEY,
        placement_id          INTEGER NOT NULL REFERENCES placement(id) ON DELETE CASCADE,
        consultant_user_id    VARCHAR(36) NOT NULL,
        amount_paise          INTEGER NOT NULL,
        reference             VARCHAR(128) NOT NULL,
        paid_at               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        recorded_by_user_id   VARCHAR(36) NOT NULL,
        created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_consultant_transfer_placement ON consultant_transfer(placement_id)`);
    console.log('[migration] consultant_transfer: ok');
  } catch (err) {
    console.error('[migration] consultant_transfer failed:', err);
  }
}
