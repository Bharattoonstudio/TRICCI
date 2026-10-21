/**
 * Migration: consultant_payout ledger.
 * One row per successful placement. Tracks the joining date, employer payment,
 * the consultant's invoice, admin holds and refunds. The release status is
 * derived by decidePayoutRelease(); no money is moved by this table.
 */
import { db } from '../client.js';

export async function migrateConsultantPayout() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS consultant_payout (
        id                    SERIAL PRIMARY KEY,
        submission_id         INTEGER NOT NULL UNIQUE REFERENCES submission(id) ON DELETE CASCADE,
        consultant_user_id    VARCHAR(36) NOT NULL,
        joining_date          TIMESTAMP,
        employer_paid_at      TIMESTAMP,
        invoice_number        VARCHAR(64),
        invoice_submitted_at  TIMESTAMP,
        admin_hold            BOOLEAN NOT NULL DEFAULT FALSE,
        refunded_at           TIMESTAMP,
        created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_consultant_payout_consultant ON consultant_payout(consultant_user_id)`);
    console.log('[migration] consultant_payout: ok');
  } catch (err) {
    console.error('[migration] consultant_payout failed:', err);
  }
}
