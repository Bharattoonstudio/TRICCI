/**
 * Migration: force consultants who signed an older consultant agreement to re-accept.
 * Clears agreement_signed_at for any consultant whose signed version is not the
 * current one. The existing agreement gate then shows the agreement again.
 * Idempotent: once a consultant re-signs, their version matches and is left alone.
 */
import { db } from '../client.js';
import { CONSULTANT_AGREEMENT_VERSION } from '../../legal/consultantAgreementText.js';

export async function migrateConsultantAgreementReaccept() {
  try {
    await db.execute(`ALTER TABLE consultant_profile ADD COLUMN IF NOT EXISTS agreement_version VARCHAR(16)`);
    // Tell each consultant whose signature is about to be cleared. Runs once: after the UPDATE
    // below their signature is null, so the next startup finds nothing to notify.
    await db.execute(`
      INSERT INTO notification (user_id, type, message, link)
      SELECT user_id, 'agreement_update',
             'TRICCI has updated the consultant agreement. Please read and accept the new version to continue.',
             '/consultant/dashboard'
        FROM consultant_profile
       WHERE agreement_signed_at IS NOT NULL
         AND (agreement_version IS NULL OR agreement_version <> '${CONSULTANT_AGREEMENT_VERSION}')
    `);
    const result = await db.execute(`
      UPDATE consultant_profile
         SET agreement_signed_at = NULL
       WHERE agreement_signed_at IS NOT NULL
         AND (agreement_version IS NULL OR agreement_version <> '${CONSULTANT_AGREEMENT_VERSION}')
    `);
    console.log(`[migration] consultant_agreement_reaccept: cleared ${(result as any).rowCount ?? 0} signature(s)`);
  } catch (err) {
    console.error('[migration] consultant_agreement_reaccept failed:', err);
  }
}
